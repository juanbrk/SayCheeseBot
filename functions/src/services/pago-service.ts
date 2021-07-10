import {db} from "..";
import {ExtendedContext} from "../../config/context/myContext";
import {CollectionName} from "../modules/enums/collectionName";
import {pagosFactory} from "../modules/factories/pagosFactory";
import {PagoFirestore} from "../modules/models/pago";

import functions = require("firebase-functions");
import DateTime = require("luxon");


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
      await pagoRef.set(documentoPago);
      return ctx.reply("Ya está registrado el nuevo pago");
    } catch (error) {
      functions.logger.log("Ocurrió un error registrando un nuevo pago", error);
      Promise.reject(error);
    }
  }
  return;
}
