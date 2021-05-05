import {CobroFirestore} from "../models/cobro";

/**
 * Para guardar el cobro como referencia en documentos de firestore
 *
 * @param {CobroFirestore}  cobro documento de firestore con todos los datos del cobro
 * @return {CobroAsEntity}
 */
export const cobroAsEntityFactory = (cobro: CobroFirestore) => {
  console.log("AHORA ES EL MOMENTO DEL COBRO AS ENTITY FACTORY");
  const {monto, uid} = cobro;
  return {monto, uid};
};