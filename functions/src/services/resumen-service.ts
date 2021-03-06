import {db} from "..";
import {ExtendedContext} from "../../config/context/myContext";
import {CollectionName} from "../modules/enums/collectionName";
import {TipoResumen} from "../modules/enums/resumen";
import {actualizacionResumenFactory, resumenFactory} from "../modules/factories/resumenFactory";
import {BalanceFirestore} from "../modules/models/balance";
import {ListadoResumenes, ResumenFirestore} from "../modules/models/resumen";
import {PagoFirestore} from "../modules/models/pago";
import {pagosFactory} from "../modules/factories/pagosFactory";

import DateTime = require("luxon");
import functions = require("firebase-functions");
import {balanceFactoryFromSaldo} from "../modules/factories/balanceFactory";
import {registrarBalance} from "./balance-service";

/**
 * Con cada cobro se genera un balance y, a partir de ese balance, se genera un nuevo resumen mensual o
 * se adiciona al existente, si es que ya hay uno creado, para asi llevar registro de lo cobrado durante un periodo
 *
 * @param {BalanceFirestore} documentoDelBalance A partir del cual se extrae el mes y el año para el resumen
 * @return {Promise}
 */
export async function mandarAlResumen(documentoDelBalance: BalanceFirestore): Promise<any> {
  const {mes: mesDelBalance, año: añoDelBalance} = documentoDelBalance;
  const resumenRef = db.collection(CollectionName.RESUMEN);
  const doc = await resumenRef.doc(`${mesDelBalance}_${añoDelBalance}_mensual`).get();
  let docDelResumen: ResumenFirestore;

  if (!doc.exists) {
    docDelResumen = await generarResumenMensual(
      mesDelBalance,
      añoDelBalance,
      documentoDelBalance
    );
    return guardarResumen(docDelResumen);
  } else {
    docDelResumen = doc.data() as ResumenFirestore;
    const resumenActualizado: ResumenFirestore= actualizacionResumenFactory(docDelResumen, documentoDelBalance);
    return guardarResumen(resumenActualizado);
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
  documentoDelBalance : BalanceFirestore,
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
  const {uid} = resumenAGuardar;
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
  const resumenes : ListadoResumenes = [];
  resumenesSnapshot.forEach((doc) => {
    const resumen= doc.data() as ResumenFirestore;
    resumenes.push(resumen);
  });
  return resumenes;
}

/**
 * Obtenemos el resumen según su UID
 *
 * @param {string} resumenUID
 * @return {Promise<ResumenFirestore>}
 */
export async function getResumenByUID(resumenUID: string) {
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
  if (ctx.scene.session.datosSaldoDeuda) {
    const {datosSaldoDeuda} = ctx.scene.session;
    const uid = `${datosSaldoDeuda.registradoPor.toLowerCase()}-${DateTime.DateTime.utc().toFormat("yMMddHHmmss")}`;
    const documentoPago: PagoFirestore = pagosFactory(ctx, uid);
    const pagoRef = db.collection(CollectionName.PAGO).doc(`${uid}`);

    try {
      pagoRef.set(documentoPago)
        .then(() => {
          const balanceDoc: BalanceFirestore = balanceFactoryFromSaldo(documentoPago);
          return registrarBalance(balanceDoc);
        });
    } catch (error) {
      functions.logger.log("Ocurrió un error registrando un nuevo pago", error);
      Promise.reject(error);
    }
  }
  return ctx.reply("Ya está registrado el saldo");
}
