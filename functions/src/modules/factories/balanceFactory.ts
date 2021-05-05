import admin = require("firebase-admin");
import {CobroFirestore} from "../models/cobro";
import {cobroAsEntityFactory} from "./cobroAsEntityFactory";

/**
 * A partir de un cobro, debemos generar un balance para saber quien cobró y cuanto le corresponde a cada socia
 * @param {CobroFirestore} cobro A partir del cual generaremos el balance
 * @return {Balance}
 */
export const balanceFactory = (cobro: CobroFirestore) => {
  const año: number = new Date().getFullYear();
  const mes: number = new Date().getMonth();

  const cobroAsEntity = cobroAsEntityFactory(cobro);
  const {leCorrespondeAFer, leCorrespondeAFlor} = asignarCuantoLeCorrespondeACadaSocia();
  const uid = generarUidDelBalance();


  /**
   * Para saber cuanto le corresponde a cada socia a partir de un cobro, se genera un balance con dos valores:
   *  - Ambos valores corresponden a la mitad de lo cobrado
   *  - Un valor es positivo e indica que esa persona ha cobrado ese dinero y le debe a la otra
   *  - Un valor es negativo e indica que a esa persona se le adeuda ese monto por dicho cobro
   *
   * @return {any} con dos valores, uno positivo para quien cobró y uno negativo para quien se le adeuda
   */
  function asignarCuantoLeCorrespondeACadaSocia() {
    let leCorrespondeAFer;
    let leCorrespondeAFlor;
    const laMitadDeLoCobrado: number = cobro.monto / 2;
    const cobroFer = cobro.registradoPor == "Fer";

    if (cobroFer) {
      leCorrespondeAFer = laMitadDeLoCobrado;
      leCorrespondeAFlor = laMitadDeLoCobrado * -1;
    } else {
      leCorrespondeAFlor = laMitadDeLoCobrado;
      leCorrespondeAFer = laMitadDeLoCobrado * -1;
    }
    return {
      leCorrespondeAFlor,
      leCorrespondeAFer,
    };
  }

  /**
   * Necesitamos generar el UID con el que guardaremos el documento en firebase
   * @return {string} con el UID del documento a guardar
   */
  function generarUidDelBalance() {
    const timestamp = Date.now();
    const quienRealizoElCobro = cobro.registradoPor == "Fer" ? "fer" : "flor";
    const clienteUID = cobro.cliente.uid;

    return `${timestamp}-${quienRealizoElCobro}-${clienteUID}`;
  }


  return {
    cobro: cobroAsEntity,
    leCorrespondeAFer,
    leCorrespondeAFlor,
    fechaGenerado: admin.firestore.Timestamp.fromDate(new Date()),
    año,
    mes,
    uid,
  };
};

