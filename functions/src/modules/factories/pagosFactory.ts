import {ExtendedContext} from "../../../config/context/myContext";
import {PagoAsEntity, PagoFirestore} from "../models/pago";

/**
 * Para guardar el pago como referencia en documentos de firestore
 *
 * @param {ExtendedContext} ctx
 * @param {string} uid del nuevo pago
 * @return {PagoFirestore}
 */
export const pagosFactory = (ctx: ExtendedContext, uid: string): PagoFirestore => {
  const {datosPago: pagoSession} = ctx.scene.session;
  const dateCreated = new Date();
  const dateUpdated = new Date();
  const pagoUid = uid;

  return {
    ...pagoSession!,
    dateCreated,
    dateUpdated,
    uid: pagoUid,
  };
};

/**
 * Para guardar el pago como referencia en documentos de firestore
 *
 * @param {number}  monto valor del monto del pago
 * @param {string}  uid uid del pago
 * @return {PagoAsEntity}
 */
export const pagoAsEntityFactory = (monto: number, uid: string): PagoAsEntity => {
  return {monto, uid};
};

