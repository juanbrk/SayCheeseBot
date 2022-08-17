import admin = require("firebase-admin");
import { db } from "..";
import { ExtendedContext } from "../../config/context/myContext";
import { CollectionName } from "../modules/enums/collectionName";
import { TipoResumen } from "../modules/enums/resumen";
import { actualizacionResumenFactory, resumenFactory } from "../modules/factories/resumenFactory";
import { BalanceFirestore } from "../modules/models/balance";
import { ListadoResumenes, ResumenFirestore } from "../modules/models/resumen";
import { imprimirEnConsola } from "../modules/utils/general";
import { TipoImpresionEnConsola } from "../modules/enums/tipoImpresionEnConsola";
import DateTime = require("luxon");
import { Socias } from "../modules/enums/socias";
import { PagoFirestore } from "../modules/models/pago";
import { pagosFactory } from "../modules/factories/pagosFactory";
import { registrarBalance } from "./balance-service";
import { balanceFactoryFromSaldo } from "../modules/factories/balanceFactory";
import { QueryOperators } from "../modules/enums/QueryOperators";
import { TipoTransaccion } from "../modules/enums/tipoTransaccion";
import { saldarCobrosDeMes } from "./cobro-service";
import { saldarPagosDeMes } from "./pago-service";


/**
 * Con cada cobro|pago se genera un balance y, a partir de ese balance, se genera un nuevo resumen mensual o
 * se actualiza el existente, si es que ya hay uno creado, para asi llevar registro de lo cobrado|pagado durante un
 * periodo. Si la transaccion es a partir de un saldo, no se refleja la transaccion en el resumen para no alterar
 * los valores por lo que es considerado una transaccion sin impacto en el resumen.
 *
 * @param {BalanceFirestore} documentoDelBalance A partir del cual se extrae el mes y el año para el resumen
 * @return {Promise}
 */
export async function mandarAlResumen(documentoDelBalance: BalanceFirestore): Promise<any> {
  const { mes: mesDelBalance, año: añoDelBalance, tipoTransaccion } = documentoDelBalance;
  const resumenRef = db.collection(CollectionName.RESUMEN);
  const doc = await resumenRef.doc(`${mesDelBalance}_${añoDelBalance}_mensual`).get();
  let docDelResumen: ResumenFirestore;

  if (tipoTransaccion != TipoTransaccion.SALDO) {
    if (!doc.exists) {
      docDelResumen = await generarResumenMensual(
        mesDelBalance,
        añoDelBalance,
        documentoDelBalance
      );
      return guardarResumen(docDelResumen);
    } else {
      docDelResumen = doc.data() as ResumenFirestore;
      const resumenActualizado: ResumenFirestore = actualizacionResumenFactory(docDelResumen, documentoDelBalance);
      return guardarResumen(resumenActualizado, true);
    }
  }
}

/**
 * Si no existen resumenes para un mes dado, se genera uno a partir de un balance para acumular los
 * ingresos de ese mes
 *
 * @param {number} mes
 * @param {number} año
 * @param {BalanceFirestore} documentoDelBalance
 * @return {ResumenFirestore} del tipo mensual
 */
const generarResumenMensual = async (
  mes: number,
  año: number,
  documentoDelBalance: BalanceFirestore,
) => {
  return resumenFactory(
    mes,
    año,
    TipoResumen.MENSUAL,
    documentoDelBalance,
  );
};

/**
 * Para llevar registro de cuanto se ha cobrado en un periodo de tiempo, necesitamos poder guardar
 * resumenes
 *
 * @param {ResumenFirestore} resumenAGuardar en firestore
 * @param {boolean} esActualizacion nos permite saber si crear o actualizar el documento en firestore
 * @return {Promise<FirebaseFirestore.WriteResult>}
 */
const guardarResumen = async (resumenAGuardar: ResumenFirestore, esActualizacion = false): Promise<FirebaseFirestore.WriteResult> => {
  const { uid } = resumenAGuardar;
  const docRef = db.collection(CollectionName.RESUMEN).doc(`${uid}`);
  if (!esActualizacion) {
    return docRef.set(resumenAGuardar);
  } else {
    return docRef.update(resumenAGuardar);
  }
};

/**
 * Necesitamos obtener los resumenes para presentar en el submenú de generación
 * de resumenes
 *
 * @return {Promise<ListadoResumenes>}
 */
export async function getResumenes(): Promise<ListadoResumenes> {
  const resumenesSnapshot = await db.collection(CollectionName.RESUMEN).get();
  const resumenes: ListadoResumenes = [];
  resumenesSnapshot.forEach((doc) => {
    const resumen = doc.data() as ResumenFirestore;
    resumenes.push(resumen);
  });
  return resumenes;
}

/**
 * Cuando las socias desean saldar sus deudas, obtenemos todos los resumenes que aun no estan saldados para calcular
 * la deuda que tienen y presentarselas
 *
 * @return {Promise<ListadoResumenes>} el listado de los resumenes que aun no están saldados
 */
export async function obtenerResumenesSinSaldar(): Promise<ListadoResumenes> {
  const resumenesASaldarSnapshot = await db.collection(CollectionName.RESUMEN)
    .where("saldado", QueryOperators.EQ, false)
    .orderBy("createdAt", QueryOperators.SORT_BY_ASC)
    .get();

  const resumenes: ListadoResumenes = [];
  resumenesASaldarSnapshot.forEach((doc) => {
    const resumen = doc.data() as ResumenFirestore;
    resumenes.push(resumen);
  });

  return resumenes;
}

/**
 * El saldo parcial del resumen se hace actualizando el monto que adeuda la deudora, para que coincida con el saldo
 * pendiente
 *
 * @param {ResumenFirestore} resumenASaldar es el resumen al que se le actualizará el monto adeudado para la socia deudora
 * @param {Number} saldoPendiente el nuevo valor que deberá la socia deudora
 * @param {Socias} sociaDeudora
 * @return {Promise<FirebaseFirestore.WriteResult> }
 */
export const saldarResumenParcial = async (
  resumenASaldar: ResumenFirestore,
  saldoPendiente: number,
  sociaDeudora: Socias
): Promise<FirebaseFirestore.WriteResult> => {
  let { ferDebeAFlor, florDebeAFer } = resumenASaldar;

  switch (sociaDeudora) {
    case Socias.FER:
      ferDebeAFlor = saldoPendiente;
      florDebeAFer = 0;
      break;
    case Socias.FLOR:
      florDebeAFer = saldoPendiente;
      ferDebeAFlor = 0;
      break;
    default:
      break;
  }
  const docRef = db.collection(CollectionName.RESUMEN).doc(`${resumenASaldar.uid}`);
  const resumenSaldadoParcialmente: ResumenFirestore = {
    ...resumenASaldar,
    florDebeAFer: florDebeAFer,
    ferDebeAFlor: ferDebeAFlor,
    updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
  };

  return docRef.update(resumenSaldadoParcialmente);
};

/**
 * Para saldar un resumen, ademas de setear al mismo como saldado, chequeamos si entre las socias se deben algo. Si
 * hay una deuda entre ellas, se balancea para que nadie le deba nada a nadie.
 *
 * @param {ResumenFirestore} resumenASaldar
 */
export const saldarResumen = async (resumenASaldar: ResumenFirestore) => {
  const docRef = db.collection(CollectionName.RESUMEN).doc(`${resumenASaldar.uid}`);
  const { ferDebeAFlor, florDebeAFer } = resumenASaldar;
  let montoParaBalancearDeuda = 0;

  const montoAdeudadoPorFer = ferDebeAFlor - florDebeAFer;
  if (montoAdeudadoPorFer != 0) {
    const sociaDeudora: Socias = montoAdeudadoPorFer > 0 ? Socias.FER : Socias.FLOR;
    switch (sociaDeudora) {
      case Socias.FER:
        montoParaBalancearDeuda = ferDebeAFlor;
        break;
      case Socias.FLOR:
        montoParaBalancearDeuda = florDebeAFer;
        break;
      default:
        break;
    }
  }

  const resumenSaldado: ResumenFirestore = {
    ...resumenASaldar,
    florDebeAFer: montoParaBalancearDeuda,
    ferDebeAFlor: montoParaBalancearDeuda,
    saldado: true,
  };

  await docRef.update(resumenSaldado);
};

/**
 * Obtenemos el resumen según su UID
 *
 * @param {string} resumenUID
 * @return {Promise<ResumenFirestore>}
 */
export async function getResumenByUID(resumenUID: string): Promise<ResumenFirestore> {
  const resumenRef = await db.collection(CollectionName.RESUMEN).doc(resumenUID).get();
  if (!resumenRef.exists) {
    console.log(`No se encontró resumen para el UID ${resumenUID}`);
    throw new Error("No se encontró resumen para el UID ${resumenUID}`");
  } else {
    return resumenRef.data() as ResumenFirestore;
  }
}

/**
 *
 * @param {ExtendedContext} ctx
 */
export async function registrarSaldo(ctx: ExtendedContext) {
  if (ctx.scene.session.datosSaldoTotalDeuda) {
    const { datosSaldoTotalDeuda } = ctx.scene.session;
    const sociaAdeudada = datosSaldoTotalDeuda.deudora == Socias.FER ? Socias.FLOR : Socias.FER;
    const uid = `saldo-${datosSaldoTotalDeuda.deudora.toLowerCase()}-debe-${sociaAdeudada.toLowerCase()}-${DateTime.DateTime.utc().toFormat("yMMddHHmmss")}`;

    const documentoPago: PagoFirestore = pagosFactory(ctx, uid);
    const pagoRef = db.collection(CollectionName.PAGO).doc(`${uid}`);

    try {
      pagoRef.set(documentoPago)
        .then(() => {
          const balanceDoc: BalanceFirestore = balanceFactoryFromSaldo(documentoPago);
          return registrarBalance(balanceDoc);
        });
    } catch (error) {
      imprimirEnConsola("Ocurrió un error registrando un nuevo pago", TipoImpresionEnConsola.ERROR, { error });
      Promise.reject(error);
    }
  }
  return ctx.reply("Ya está registrado el saldo");
}

/**
 * Cuando un resumen es alterado podemos tratar las siguientes cosas:
 *
 *   - Si el resumen fue saldado (saldado == true) tomar todos los cobros y pagos del mes y saldarlos
 *
 * @param {ResumenFirestore} resumenAlterado que fue modificado
 */
export const tratarResumenAlterado = async (resumenAlterado: ResumenFirestore) => {
  if (resumenAlterado.saldado) {
    const { mes: mesDeLosCobros, year: anoDeLosCobros } = resumenAlterado;

    saldarCobrosDeMes(mesDeLosCobros, anoDeLosCobros);
    saldarPagosDeMes(mesDeLosCobros, anoDeLosCobros);
  }
};
