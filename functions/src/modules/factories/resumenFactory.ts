import admin = require("firebase-admin");
import {TipoResumen} from "../enums/resumen";
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
  const ferRealizoElCobro = documentoBalance.leCorrespondeAFer > 0;
  const mes: number = mesDelResumen;
  const año: number = añoDelResumen;
  const subTotalCobrado = documentoBalance.cobro.monto;
  const totalCobrado = documentoBalance.cobro.monto;
  const florDebeAFer = ferRealizoElCobro ? 0 : documentoBalance.leCorrespondeAFlor;
  const ferDebeAFlor = ferRealizoElCobro ? documentoBalance.leCorrespondeAFer : 0;
  const correspondeACadaSocia = Math.abs(documentoBalance.leCorrespondeAFlor);
  const uid = `${mes}_${año}_${tipoResumen}`.toLowerCase();
  const cantidadDeCobros = 1;

  return {
    mes,
    year: año,
    tipoResumen,
    subTotalCobrado,
    totalCobrado,
    florDebeAFer,
    ferDebeAFlor,
    correspondeACadaSocia,
    createdAt: admin.firestore.Timestamp.fromDate(new Date()),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
    uid,
    cantidadDeCobros,
  };
};

/**
 * Actualizamos un resumen existente en firestore con datos de un nuevo balance generado a partir de un nuevo
 * cobro a clientes
 *
 * @param {ResumenFirestore} documentoResumen Ya existente en firestore
 * @param {BalanceFirestore} documentoBalance A partir del cual acumular en el resumen existente
 * @return {ResumenFirestore} actualizado con los nuevos datos del balance
 */
export const actualizacionResumenFactory = (
  documentoResumen: ResumenFirestore,
  documentoBalance: BalanceFirestore,
): ResumenFirestore => {
  const ferRealizoElCobro = documentoBalance.leCorrespondeAFer > 0;
  const florDebeAFer = ferRealizoElCobro ? 0 : documentoBalance.leCorrespondeAFlor;
  const ferDebeAFlor = ferRealizoElCobro ? documentoBalance.leCorrespondeAFer : 0;

  documentoResumen = {
    ...documentoResumen,
    subTotalCobrado: documentoResumen.subTotalCobrado + documentoBalance.cobro.monto,
    totalCobrado: documentoResumen.totalCobrado + documentoBalance.cobro.monto,
    florDebeAFer: documentoResumen.florDebeAFer + florDebeAFer,
    ferDebeAFlor: documentoResumen.ferDebeAFlor + ferDebeAFlor,
    correspondeACadaSocia: documentoResumen.correspondeACadaSocia + Math.abs(documentoBalance.leCorrespondeAFlor),
    updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
    cantidadDeCobros: documentoResumen.cantidadDeCobros + 1,
  };

  return documentoResumen;
};
