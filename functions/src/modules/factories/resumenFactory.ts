import admin = require("firebase-admin");
import {TipoResumen} from "../enums/resumen";
import {Socias} from "../enums/socias";
import {TipoTransaccion} from "../enums/tipoTransaccion";
import {BalanceFirestore} from "../models/balance";
import {ResumenFirestore} from "../models/resumen";

/**
 * Necesitamos poder generar resumenes a pedido
 *
 * @param {number} mesDelResumen
 * @param {number} añoDelResumen
 * @param {TipoResumen} tipoResumen puede ser mensual,
 * @param {BalanceFirestore} documentoBalance a partir del cual generar el resumen
 * @return {ResumenFirestore}
 */
export const resumenFactory = (
  mesDelResumen: number,
  añoDelResumen: number,
  tipoResumen: TipoResumen,
  documentoBalance: BalanceFirestore,
): ResumenFirestore => {
  const seGeneroAPartirDeUnCobro = documentoBalance.tipoTransaccion == TipoTransaccion.COBRO;
  const seLeDebeAFlor = documentoBalance.leCorrespondeAFer > 0;
  const transaccionRealizadaPorFer = documentoBalance.transaccion.realizadoPor == Socias.FER;
  const mes: number = mesDelResumen;
  const año: number = añoDelResumen;
  const totalCobrado = seGeneroAPartirDeUnCobro ? documentoBalance.transaccion.monto : 0;
  const totalPagado = !seGeneroAPartirDeUnCobro ? documentoBalance.transaccion.monto : 0;
  const florDebeAFer = seLeDebeAFlor ? 0 : documentoBalance.leCorrespondeAFlor;
  const ferDebeAFlor = seLeDebeAFlor ? documentoBalance.leCorrespondeAFer : 0;
  const correspondeACadaSocia = seGeneroAPartirDeUnCobro ? documentoBalance.transaccion.monto / 2: 0;
  const totalCobradoPorFer = seGeneroAPartirDeUnCobro && transaccionRealizadaPorFer ? totalCobrado : 0;
  const totalCobradoPorFlor = seGeneroAPartirDeUnCobro && !transaccionRealizadaPorFer ? totalCobrado : 0;
  const uid = `${mes}_${año}_${tipoResumen}`.toLowerCase();
  const cantidadDeCobros = seGeneroAPartirDeUnCobro ? 1 : 0;
  const cantidadDePagos = seGeneroAPartirDeUnCobro ? 0 : 1;

  return {
    mes,
    year: año,
    tipoResumen,
    totalCobrado,
    totalPagado,
    florDebeAFer,
    ferDebeAFlor,
    correspondeACadaSocia,
    totalCobradoPorFer,
    totalCobradoPorFlor,
    createdAt: admin.firestore.Timestamp.fromDate(new Date()),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
    uid,
    cantidadDeCobros,
    cantidadDePagos,
  };
};

/**
 * Actualizamos un resumen existente en firestore con datos de un nuevo balance generado a partir de un nuevo
 * cobro a clientes, un pago o un saldo de deuda
 *
 *
 * @param {ResumenFirestore} documentoResumen Ya existente en firestore
 * @param {BalanceFirestore} documentoBalance A partir del cual acumular en el resumen existente
 * @return {ResumenFirestore} actualizado con los nuevos datos del balance
 */
export const actualizacionResumenFactory = (
  documentoResumen: ResumenFirestore,
  documentoBalance: BalanceFirestore,
): ResumenFirestore => {
  const seLeDebeAFlor = documentoBalance.leCorrespondeAFer > 0;
  const florDebeAFer = seLeDebeAFlor ? 0 : documentoBalance.leCorrespondeAFlor;
  const ferDebeAFlor = seLeDebeAFlor ? documentoBalance.leCorrespondeAFer : 0;
  const transaccionRealizadaPorFer = documentoBalance.transaccion.realizadoPor == Socias.FER;
  const seActualizaDebidoAUnCobro = documentoBalance.tipoTransaccion == TipoTransaccion.COBRO;

  documentoResumen = {
    ...documentoResumen,
    totalCobrado: seActualizaDebidoAUnCobro ? documentoResumen.totalCobrado + documentoBalance.transaccion.monto : documentoResumen.totalCobrado,
    totalPagado: !seActualizaDebidoAUnCobro ? documentoResumen.totalPagado + documentoBalance.transaccion.monto : documentoResumen.totalPagado,
    florDebeAFer: documentoResumen.florDebeAFer + florDebeAFer,
    ferDebeAFlor: documentoResumen.ferDebeAFlor + ferDebeAFlor,
    totalCobradoPorFer: seActualizaDebidoAUnCobro && transaccionRealizadaPorFer ? documentoResumen.totalCobradoPorFer + documentoBalance.transaccion.monto : documentoResumen.totalCobradoPorFer,
    totalCobradoPorFlor: seActualizaDebidoAUnCobro && !transaccionRealizadaPorFer ? documentoResumen.totalCobradoPorFlor + documentoBalance.transaccion.monto : documentoResumen.totalCobradoPorFlor,
    correspondeACadaSocia: seActualizaDebidoAUnCobro ? documentoResumen.correspondeACadaSocia + documentoBalance.transaccion.monto/2: documentoResumen.correspondeACadaSocia,
    updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
    cantidadDeCobros: seActualizaDebidoAUnCobro ? documentoResumen.cantidadDeCobros + 1 : documentoResumen.cantidadDeCobros,
    cantidadDePagos: seActualizaDebidoAUnCobro ? (documentoResumen.cantidadDePagos == undefined ? 0 : documentoResumen.cantidadDePagos ) : (documentoResumen.cantidadDePagos == undefined ? 1 : documentoResumen.cantidadDePagos + 1),
  };

  return documentoResumen;
};
