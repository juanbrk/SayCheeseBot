import {ExtendedContext} from "../../config/context/myContext";
import {db} from "../../src/index";
import {CobroFirestore} from "../modules/models/cobro";

/**
 *
 * @param {ExtendedContext} ctx
 * @param {Cliente} cliente que debemos guardar
 */
export async function registrarCobro(ctx: ExtendedContext) {
  const coleccion = "Cobro";
  if (ctx.session.cobro) {
    const {cobro} = ctx.session;
    const uid = `${ctx.session.cobro.cliente.uid}_${ctx.session.cobro.motivo!.replace(/ /g, "_").toLowerCase()}`;
    const docRef = db.collection(coleccion).doc(`${uid}`);
    const documentoCobro: CobroFirestore= {
      uid: uid,
      registradoPor: cobro.registradoPor!,
      cliente: cobro.cliente,
      monto: cobro.monto!,
      fechaCobro: new Date(),
      motivo: cobro.motivo!,
    };
    await docRef.set(documentoCobro);
  }
  return ctx.reply(`${"Se registró correctamente el cobro a"} ${ctx.session.cobro!.cliente.nombre!}`);
}
