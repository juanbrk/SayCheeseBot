import {ExtendedContext} from "../../config/context/myContext";
import {db} from "../../src/index";
import {CollectionName} from "../modules/enums/collectionName";
import {balanceFactoryFromCobro} from "../modules/factories/balanceFactory";
import {BalanceFirestore} from "../modules/models/balance";
import {CobroFirestore} from "../modules/models/cobro";
import {registrarBalance} from "./balance-service";
/**
 *
 * @param {ExtendedContext} ctx
 * @param {Cliente} cliente que debemos guardar
 */
export async function registrarCobro(ctx: ExtendedContext) {
  if (ctx.scene.session.datosCobro) {
    const {datosCobro} = ctx.scene.session;
    const uid = `${ctx.scene.session.datosCobro.cliente.uid}_${ctx.scene.session.datosCobro.motivo!.replace(/ /g, "_").toLowerCase()}`;
    const docRef = db.collection(CollectionName.COBRO).doc(`${uid}`);
    if (datosCobro.registradoPor && datosCobro.monto && datosCobro.asignadoA) {
      const documentoCobro: CobroFirestore= {
        uid: uid,
        registradoPor: datosCobro.registradoPor,
        cobradoPor: datosCobro.asignadoA,
        estaDividido: !!datosCobro.dividieronLaPlata,
        cliente: datosCobro.cliente,
        monto: datosCobro.monto,
        fechaCobro: new Date(),
        motivo: datosCobro.motivo!,
      };
      docRef.set(documentoCobro)
        .then(() => {
          const balanceDoc: BalanceFirestore = balanceFactoryFromCobro(documentoCobro);
          return registrarBalance(balanceDoc);
        });
    }
  }
  return ctx.reply(`${"Se registró correctamente el cobro a"} ${ctx.session.cobro!.cliente.nombre!}`);
}
