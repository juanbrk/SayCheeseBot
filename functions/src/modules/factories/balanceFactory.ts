import admin = require("firebase-admin");
import {Socias} from "../enums/socias";
import {TipoImpresionEnConsola} from "../enums/tipoImpresionEnConsola";
import {TipoTransaccion} from "../enums/tipoTransaccion";
import {BalanceFirestore} from "../models/balance";
import {CobroFirestore} from "../models/cobro";
import {PagoAsEntity, PagoFirestore} from "../models/pago";
import {imprimirEnConsola} from "../utils/general";
import {cobroAsEntityFactory} from "./cobroAsEntityFactory";
import {pagoAsEntityFactory} from "./pagosFactory";

/**
 * A partir de un cobro, debemos generar un balance para saber quien cobró y cuanto le corresponde a cada socia
 * @param {CobroFirestore} cobro A partir del cual generaremos el balance
 * @return {Balance}
 */
export const balanceFactoryFromCobro = (cobro: CobroFirestore) => {
  const año: number = new Date().getFullYear();
  const mes: number = new Date().getMonth();

  const cobroAsEntity = cobroAsEntityFactory(cobro);
  const {leCorrespondeAFer, leCorrespondeAFlor} = asignarCuantoLeCorrespondeACadaSocia();
  const uid = generarUidDelBalance();
  const estaDividido: boolean = cobro.estaDividido;


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
    const elCobroEstaDividido = cobro.estaDividido;
    const laMitadDeLoCobrado: number = cobro.monto / 2;
    const cobroFer = cobro.cobradoPor == Socias.FER;

    if (cobroFer) {
      leCorrespondeAFer = elCobroEstaDividido ? 0 : laMitadDeLoCobrado;
      leCorrespondeAFlor = elCobroEstaDividido ? 0 : laMitadDeLoCobrado * -1;
    } else {
      leCorrespondeAFlor = elCobroEstaDividido ? 0 : laMitadDeLoCobrado;
      leCorrespondeAFer = elCobroEstaDividido ? 0 : laMitadDeLoCobrado * -1;
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
    const quienRealizoElCobro = cobro.registradoPor == Socias.FER ? Socias.FER.toLocaleLowerCase() : Socias.FLOR.toLowerCase();
    const clienteUID = cobro.cliente.uid;

    return `${timestamp}-${quienRealizoElCobro}-${clienteUID}`;
  }


  return {
    transaccion: cobroAsEntity,
    tipoTransaccion: TipoTransaccion.COBRO,
    leCorrespondeAFer,
    leCorrespondeAFlor,
    fechaGenerado: admin.firestore.Timestamp.fromDate(new Date()),
    año,
    mes,
    uid,
    estaDividido,
  };
};

export const balanceFactoryFromPago = (pago: PagoFirestore) : BalanceFirestore => {
  const año: number = new Date().getFullYear();
  const mes: number = new Date().getMonth();

  const pagoAsEntity : PagoAsEntity = pagoAsEntityFactory(pago.monto!, pago.uid, pago.asignadoA!);
  const {leCorrespondeAFer, leCorrespondeAFlor} = asignarCuantoLeCorrespondeACadaSocia();
  const uid = generarUidDelBalance();
  const estaDividido = !!pago.dividieronLaPlata;


  /**
   * Para saber cuanto le corresponde a cada socia a partir de un pago, se genera un balance con dos valores:
   *  - Ambos valores corresponden a la mitad de lo pagado
   *  - Un valor es positivo e indica que esa persona ha cobrado ese dinero y le debe a la otra
   *  - Un valor es negativo e indica que a esa persona se le adeuda ese monto por dicho cobro
   *
   * @return {any} con dos valores, uno positivo para quien cobró y uno negativo para quien se le adeuda
   */
  function asignarCuantoLeCorrespondeACadaSocia() {
    let leCorrespondeAFer = 0;
    let leCorrespondeAFlor = 0;
    const elPagoEstaDividido = pago.dividieronLaPlata;
    const laMitadDeLoPagado: number = pago.monto! / 2;
    const pagoFer = pago.asignadoA == Socias.FER;
    if (!elPagoEstaDividido) {
      if (pagoFer) {
        leCorrespondeAFer = laMitadDeLoPagado * -1;
        leCorrespondeAFlor = laMitadDeLoPagado;
      } else {
        leCorrespondeAFer = laMitadDeLoPagado;
        leCorrespondeAFlor = laMitadDeLoPagado *-1;
      }
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
    const quienPago = pago.asignadoA == Socias.FER ? Socias.FER.toLocaleLowerCase() : Socias.FLOR.toLowerCase();
    const pagoUID = pago.motivo!.replace(/ /g, "_").toLowerCase();

    return `${timestamp}-${quienPago}-${pagoUID}`;
  }

  return {
    transaccion: pagoAsEntity,
    tipoTransaccion: TipoTransaccion.PAGO,
    leCorrespondeAFer,
    leCorrespondeAFlor,
    fechaGenerado: admin.firestore.Timestamp.fromDate(new Date()),
    año,
    mes,
    uid,
    estaDividido,
  };
};

/**
 *
 * @param {PagoFirestore} pago Necesitamos generar un balance a partir del saldo de una deuda. El saldo
 * de una deuda se ingresa como pago
 * @return {BalanceFirestore}
 */
export const balanceFactoryFromSaldo = (pago: PagoFirestore) : BalanceFirestore => {
  imprimirEnConsola("Balance from saldo", TipoImpresionEnConsola.DEBUG, {pago});
  const año: number = new Date().getFullYear();
  const mes: number = new Date().getMonth();

  const sociaQueSaldo: Socias = pago.registradoPor == Socias.FER ? Socias.FER : Socias.FLOR;

  const pagoAsEntity : PagoAsEntity = pagoAsEntityFactory(pago.monto!, pago.uid, sociaQueSaldo);
  const {leCorrespondeAFer, leCorrespondeAFlor} = asignarCuantoLeCorrespondeACadaSocia();
  const uid = generarUidDelBalance();


  /**
   * Para saber cuanto le corresponde a cada socia a partir de un saldo, se genera un balance con dos valores:
   *  - Ambos valores corresponden al total de lo pagado
   *  - Un valor es positivo e indica que esa persona es la adeudada y ha cobrado ese dinero
   *  - Un valor es negativo e indica que a esa persona es la deudora y saldó su cuenta por ese monto
   *
   * @return {any} con dos valores, uno positivo para quien cobró y uno negativo para quien saldó
   */
  function asignarCuantoLeCorrespondeACadaSocia() {
    let leCorrespondeAFer = 0;
    let leCorrespondeAFlor = 0;
    const montoPagado: number = pago.monto!;
    const pagoFer = pago.asignadoA == Socias.FER;

    if (pagoFer) { // Fer es deudora y saldó
      leCorrespondeAFer = montoPagado * -1;
      leCorrespondeAFlor = montoPagado;
    } else {
      leCorrespondeAFer = montoPagado;
      leCorrespondeAFlor = montoPagado *-1;
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
    const quienPago = pago.asignadoA == Socias.FER ? Socias.FER.toLocaleLowerCase() : Socias.FLOR.toLowerCase();
    const pagoUID = "saldo";

    return `${timestamp}-${quienPago}-${pagoUID}`;
  }

  return {
    transaccion: pagoAsEntity,
    tipoTransaccion: TipoTransaccion.SALDO,
    leCorrespondeAFer,
    leCorrespondeAFlor,
    fechaGenerado: admin.firestore.Timestamp.fromDate(new Date()),
    año,
    mes,
    uid,
    estaDividido: false,
  };
};

