import {ExtendedContext} from "../../config/context/myContext";
import {db} from "../../src/index";
import {CollectionName} from "../modules/enums/collectionName";
import {balanceFactoryFromCobro} from "../modules/factories/balanceFactory";
import {BalanceFirestore} from "../modules/models/balance";
import {CobroFirestore, ResumenCobro, ResumenesCobro} from "../modules/models/cobro";
import {registrarBalance} from "./balance-service";

import DateTime = require("luxon");
import {Socias} from "../modules/enums/socias";

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
  const cobros : ResumenesCobro= [];
  cobrosSnapshot.forEach((doc) => {
    const cobro : ResumenCobro = {
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
 * Cuando se visualizan los cobros para un mes, se debe calcular el rango de fechas en el cual mostrar los
 * cobros, que corresponde a todo un mes.
 *
 * @param {string} indiceMes del mes seleccionado por el usuario
 * @return {any} con el rango de fechas de cobro
 */
function calcularMesInicialYFinal(indiceMes: string) {
  const indiceNumerico = +indiceMes;
  let mesInicio = indiceMes;
  let mesFinal = `${indiceNumerico + 1}`;
  if (indiceNumerico < 10) {
    mesInicio = `0${indiceMes}`;
  }

  if (indiceNumerico + 1 < 10) {
    mesFinal = `0${indiceNumerico + 1}`;
  }

  if (indiceNumerico + 1 > 12) {
    mesFinal = "01";
  }

  return {
    inicial: mesInicio,
    final: mesFinal,
  };
}
