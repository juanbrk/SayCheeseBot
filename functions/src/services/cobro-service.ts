import {ExtendedContext} from "../../config/context/myContext";
import {db} from "../firebase";
import {CollectionName} from "../modules/enums/collectionName";
import {balanceFactoryFromCobro} from "../modules/factories/balanceFactory";
import {BalanceFirestore} from "../modules/models/balance";
import {CobroFirestore, ResumenCobro, ResumenesCobro} from "../modules/models/cobro";
import {registrarBalance} from "./balance-service";
import DateTime = require("luxon");
import {Socias} from "../modules/enums/socias";
import {SearchRequestDTO} from "../modules/models/DTOs/searchRequestDto";
import {Filter} from "../modules/models/filter";
import {QueryOperators} from "../modules/enums/QueryOperators";
import {actualizarEntidad, buscarDocumentos} from "./firestore-service";
import {calcularMesInicialYFinal} from "./util-service";

/**
 *
 * @param {ExtendedContext} ctx
 * @param {Cliente} cliente que debemos guardar
 */
export async function registrarCobro(ctx: ExtendedContext) {
  if (ctx.scene.session.datosCobro) {
    const {datosCobro} = ctx.scene.session;
    const uid = `${ctx.scene.session.datosCobro.cliente.uid}_${ctx.scene.session.datosCobro.motivo!.replace(/ /g, "_").toLowerCase()}_${ctx.scene.session.datosCobro.asignadoA!.toLowerCase()}_${DateTime.DateTime.utc().toFormat("yMMddHHmmss")}`;
    const docRef = db.collection(CollectionName.COBRO).doc(`${uid}`);
    if (datosCobro.registradoPor && datosCobro.monto && datosCobro.asignadoA) {
      const documentoCobro: CobroFirestore = {
        uid: uid,
        registradoPor: datosCobro.registradoPor,
        cobradoPor: datosCobro.asignadoA,
        estaDividido: !!datosCobro.dividieronLaPlata,
        cliente: datosCobro.cliente,
        monto: datosCobro.monto,
        fechaCobro: new Date(),
        motivo: datosCobro.motivo!,
      };
      // Con `await`: sin esperar, se le respondía "se registró el cobro" al usuario
      // antes de que la escritura —y el Balance que dispara todo el pipeline de
      // resúmenes— hubiera llegado a Firestore.
      await docRef.set(documentoCobro);
      const balanceDoc: BalanceFirestore = balanceFactoryFromCobro(documentoCobro);
      await registrarBalance(balanceDoc);
    }
  }
  return ctx.reply(`${"Se registró correctamente el cobro a"} ${ctx.session.cobro!.cliente.nombre!}`);
}

/**
 * Para visualizar los cobros realizados en un mes, debo obtener todos los cobros realizados en ese mes
 * @param {string} indiceMes seleccionado
 * @param {string} ano seleccionado
 * @param {Socias} socia seleccionada
 * @return {ResumenesCobro} con los cobros correspondientes al mes seleccionado
 */
export async function obtenerCobrosParaMesYSocia(indiceMes: string, ano: string, socia?: Socias): Promise<ResumenesCobro> {
  const rangoCobros = calcularMesInicialYFinal(indiceMes);

  const start = new Date(`${ano}-${rangoCobros.inicial}-01`);
  const end = +rangoCobros.final !== 1 ? new Date(`${ano}-${rangoCobros.final}-01`) : new Date(`${+ano + 1}-${rangoCobros.final}-01`);

  let cobrosRef = db.collection(CollectionName.COBRO)
    .where("fechaCobro", ">", start)
    .where("fechaCobro", "<", end);

  if (socia) {
    cobrosRef = db.collection(CollectionName.COBRO)
      .where("fechaCobro", ">", start)
      .where("fechaCobro", "<", end)
      .where("cobradoPor", "==", socia);
  }

  const cobrosSnapshot = await cobrosRef.get();
  const cobros: ResumenesCobro = [];
  cobrosSnapshot.forEach((doc) => {
    const cobro: ResumenCobro = {
      fechaCobro: doc.data().fechaCobro,
      cliente: doc.data().cliente.nombre,
      datosConfirmados: true,
      dividieronLaPlata: doc.data().estaDividido,
      monto: doc.data().monto,
      motivo: doc.data().motivo,
      registradoPor: doc.data().registradoPor,
      cobradoPor: doc.data().cobradoPor,
    };
    cobros.push(cobro);
  });
  return cobros;
}

/**
 * Cuando un resumen es saldado en su totalidad, debemos recorrer sus cobros y reflejar la situación en los mismos
 *
 * @param {number} mes en el cual deben saldarse todos los cobros
 * @param {number} year en el cual deben saldarse todos los cobros
 */
export const saldarCobrosDeMes = async (mes: number, year: number) => {
  // `mes` viene 0-indexado (sale de Date.getMonth()). La cota superior es exclusiva: el
  // 1° del mes siguiente. Antes se armaba el día 31, inválido en febrero y en todos los
  // meses de 30 días — y de paso el string quedaba ISO o no según el mes tuviera dos
  // dígitos, así que la zona horaria cambiaba sola de mes a mes.
  const fechaInicioMes = new Date(year, mes, 1);
  const fechaFinalMes = new Date(year, mes + 1, 1);

  const cobrosSearchRequest: SearchRequestDTO = {
    coleccion: CollectionName.COBRO,
    filtros: [
      new Filter("fechaCobro", QueryOperators.GTE, fechaInicioMes),
      new Filter("fechaCobro", QueryOperators.LT, fechaFinalMes),
      new Filter("estaDividido", QueryOperators.EQ, false),
    ],
  };

  const cobrosDelMesASaldar: CobroFirestore[] = await buscarDocumentos(db, cobrosSearchRequest);

  // Con `await`: antes se disparaban N promesas sueltas y la función resolvía sin
  // esperarlas, así que las escrituras se perdían si la instancia se congelaba.
  await Promise.all(
    cobrosDelMesASaldar.map((cobroASaldar) => {
      cobroASaldar.estaDividido = true;
      return actualizarEntidad(db, CollectionName.COBRO, cobroASaldar.uid, cobroASaldar);
    })
  );
};
