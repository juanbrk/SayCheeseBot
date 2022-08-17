import {db} from "..";
import {ExtendedContext} from "../../config/context/myContext";
import {CollectionName} from "../modules/enums/collectionName";
import {pagosFactory} from "../modules/factories/pagosFactory";
import {PagoFirestore} from "../modules/models/pago";

import functions = require("firebase-functions");
import DateTime = require("luxon");
import {BalanceFirestore} from "../modules/models/balance";
import {balanceFactoryFromPago} from "../modules/factories/balanceFactory";
import {registrarBalance} from "./balance-service";
import {Filter} from "../modules/models/filter";
import {QueryOperators} from "../modules/enums/QueryOperators";
import {SearchRequestDTO} from "../modules/models/DTOs/searchRequestDto";
import {actualizarEntidad, buscarDocumentos} from "./firestore-service";


/**
 *
 * @param {ExtendedContext} ctx
 */
export async function registrarPago(ctx: ExtendedContext) {
  if (ctx.scene.session.datosPago) {
    const {datosPago} = ctx.scene.session;
    const uid = `${datosPago.motivo!.replace(/ /g, "_").toLowerCase()}-${datosPago.registradoPor?.toLowerCase()}-${DateTime.DateTime.utc().toFormat("yMMddHHmmss")}`;
    const documentoPago: PagoFirestore = pagosFactory(ctx, uid);
    const pagoRef = db.collection(CollectionName.PAGO).doc(`${uid}`);

    try {
      pagoRef.set(documentoPago)
        .then(() => {
          const balanceDoc: BalanceFirestore = balanceFactoryFromPago(documentoPago);
          return registrarBalance(balanceDoc);
        });
      return ctx.reply("Ya está registrado el nuevo pago");
    } catch (error) {
      functions.logger.log("Ocurrió un error registrando un nuevo pago", error);
      Promise.reject(error);
    }
  }
  return;
}

/**
 * Cuando un resumen es saldado en su totalidad, debemos recorrer sus pagos y reflejar la situación en los mismos
 *
 * @param {number} mes en el cual deben saldarse todos los pagos
 * @param {number} year en el cual deben saldarse todos los pagos
 */
export const saldarPagosDeMes = async (mes: number, year: number) => {
  const fechaInicioMes = new Date(`${year}-${mes + 1}-01`);
  const fechaFinalMes = new Date(`${year}-${mes + 1}-31`);

  const pagosSearchRequest: SearchRequestDTO = {
    coleccion: CollectionName.PAGO,
    filtros: [
      new Filter("dateCreated", QueryOperators.GTE, fechaInicioMes),
      new Filter("dateCreated", QueryOperators.LTE, fechaFinalMes),
      new Filter("dividieronLaPlata", QueryOperators.EQ, false),
    ],
  };

  const pagosDelMesASaldar: PagoFirestore[] = await buscarDocumentos(db, pagosSearchRequest);

  for (const pagosASaldar of pagosDelMesASaldar) {
    pagosASaldar.dividieronLaPlata = true;
    actualizarEntidad(db, CollectionName.PAGO, pagosASaldar.uid, pagosASaldar);
  }
};
