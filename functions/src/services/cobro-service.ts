import {ExtendedContext} from "../../config/context/myContext";
import {db} from "../../src/index";
import {CollectionName} from "../modules/enums/collectionName";
import {balanceFactory} from "../modules/factories/balanceFactory";
import {BalanceFirestore} from "../modules/models/balance";
import {CobroFirestore} from "../modules/models/cobro";
import {registrarBalance} from "./balance-service";

/**
 *
 * @param {ExtendedContext} ctx
 * @param {Cliente} cliente que debemos guardar
 */
export async function registrarCobro(ctx: ExtendedContext) {
  if (ctx.session.cobro) {
    const {cobro} = ctx.session;
    const uid = `${ctx.session.cobro.cliente.uid}_${ctx.session.cobro.motivo!.replace(/ /g, "_").toLowerCase()}`;
    const docRef = db.collection(CollectionName.COBRO).doc(`${uid}`);
    if (cobro.registradoPor && cobro.monto) {
      const documentoCobro: CobroFirestore= {
        uid: uid,
        registradoPor: cobro.registradoPor,
        cliente: cobro.cliente,
        monto: cobro.monto,
        fechaCobro: new Date(),
        motivo: cobro.motivo!,
      };
      docRef.set(documentoCobro)
        .then(() => {
          const balanceDoc: BalanceFirestore = balanceFactory(documentoCobro);
          return registrarBalance(balanceDoc);
        });
    }
  }
  return ctx.reply(`${"Se registró correctamente el cobro a"} ${ctx.session.cobro!.cliente.nombre!}`);
}
