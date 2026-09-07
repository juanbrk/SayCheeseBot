import {ExtendedContext} from "../../../config/context/myContext";
import {Socias} from "../enums/socias";
import {PagoAsEntity, PagoFirestore, PagoSession} from "../models/pago";

/**
 * Para guardar el pago como referencia en documentos de firestore
 *
 * @param {ExtendedContext} ctx
 * @param {string} uid del nuevo pago
 * @return {PagoFirestore}
 */
export const pagosFactory = (ctx: ExtendedContext, uid: string): PagoFirestore => {
  let datosPago: PagoSession = {} as PagoSession;
  if (ctx.scene.session.datosPago) {
    datosPago = ctx.scene.session.datosPago;
  } else if (ctx.scene.session.datosSaldoDeuda) { // TODO VER SI SE SIGUE USANDO
    const datosSaldo = ctx.scene.session.datosSaldoDeuda;
    datosPago = {
      datosConfirmados: datosSaldo.datosConfirmados,
      monto: datosSaldo.monto,
      registradoPor: datosSaldo.registradoPor,
      asignadoA: datosSaldo.asignadoA,
      esSaldo: true,
    };
  } else if (ctx.scene.session.datosSaldoTotalDeuda) {
    const datosSaldo = ctx.scene.session.datosSaldoTotalDeuda;
    datosPago = {
      datosConfirmados: true,
      monto: datosSaldo.montoASaldar,
      // Quien salda es siempre la deudora. Antes acá había una socia hardcodeada, así
      // que TODO saldo quedaba a nombre de la misma persona sin importar quién pagara,
      // y balanceFactory.ts lo leía de vuelta para decidir a quién acreditar: la deuda
      // terminaba invertida. `deudora` es el dato autoritativo y ya viene tipado como
      // Socias — a diferencia de `registradoPor` del wizard, que es el first_name de
      // Telegram y no coincide necesariamente con el valor del enum.
      registradoPor: datosSaldo.deudora,
      esSaldo: true,
    };
  }
  const dateCreated = new Date();
  const dateUpdated = new Date();
  const pagoUid = uid;

  return {
    ...datosPago,
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
 * @param {Socias}  generadoPor socia que realizo el pago
 * @return {PagoAsEntity}
 */
export const pagoAsEntityFactory = (monto: number, uid: string, generadoPor: Socias): PagoAsEntity => {
  return {
    monto,
    uid,
    realizadoPor: generadoPor,
  };
};

