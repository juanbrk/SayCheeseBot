import {ExtendedContext} from "../../../config/context/myContext";
import {Socias} from "../../modules/enums/socias";
import {TipoImpresionEnConsola} from "../../modules/enums/tipoImpresionEnConsola";
import {ResumenFirestore} from "../../modules/models/resumen";
import {ExtractoResumen} from "../../modules/models/saldoResumen";
import {imprimirEnConsola} from "../../modules/utils/general";
import {getResumenByUID} from "../../services/resumen-service";
import {MESES} from "../menus/choices";

/**
 * Una vez seleccionado el resumen, debemos presentarlo y enviarselo al usuario.
 *
 * @param {ExtendedContext} ctx contexto
 * @param {string} resumenUID del cliente al que se le registra el cobro
 * @return {Promise}
 */
export async function armarResumen(ctx: ExtendedContext, resumenUID: string): Promise<string> {
  imprimirEnConsola("Armando resumen", TipoImpresionEnConsola.DEBUG, {resumenUID});
  const resumenAPresentar: ResumenFirestore = await getResumenByUID(resumenUID);
  const datosExtracto = obtenerDatosExtracto(resumenAPresentar);

  ctx.session.datosSaldo = {
    resumenASaldar: resumenAPresentar,
    sociaQueAdeuda: datosExtracto.sociaQueDebe,
    montoAdeudado: datosExtracto.montoAdeudado,
  };
  const cuerpoMensajeExtracto = armarCuerpoExtracto(resumenAPresentar, datosExtracto);
  return cuerpoMensajeExtracto;
}


/**
 * A partir del resumen seleccionado para presentar al usuario, se deben obtener los valores
 * con los que se presentará el extracto
 *
 * @param {ResumenFirestore} resumen a partir del cual obtener los datos
 * @return {string} Cuerpo del mensaje final que se le enviará al usuario
 */
const obtenerDatosExtracto = (resumen: ResumenFirestore): ExtractoResumen => {
  // llevar saldos a cero
  const {florDebeAFer, ferDebeAFlor} = resumen;
  const sociaQueDebe: Socias = florDebeAFer > ferDebeAFlor? Socias.FLOR : Socias.FER;
  const sociaAdeudada: Socias = sociaQueDebe == Socias.FLOR ? Socias.FER : Socias.FLOR;
  const montoAdeudado: number = sociaQueDebe == Socias.FLOR ? florDebeAFer - ferDebeAFlor : ferDebeAFlor - florDebeAFer;
  return {
    montoAdeudado,
    sociaAdeudada,
    sociaQueDebe,
  };
};

/**
 * Una vez que el usuario seleccionoó un resumen para que se le muestre y luego
 * de obtenidos los datos que se le mostrarán, debemos armar el extracto que irá en el mensaje
 *
 * Los valores monetarios se formatearán para aparecer como moneda
 *
 * @param {ResumenFirestore} resumen que se utilizará
 * @param {ExtractoResumen} datosExtracto que formaran parte del mensaje
 * @return {string} datos con los cuales se armará el mensaje
 */
const armarCuerpoExtracto = (resumen: ResumenFirestore, datosExtracto: ExtractoResumen): string => {
  const totalCobrado = new Intl.NumberFormat("de-DE").format(resumen.totalCobrado);
  const totalPagado = new Intl.NumberFormat("de-DE").format(resumen.totalPagado);
  const totalCobradoPorFer = new Intl.NumberFormat("de-DE").format(resumen.totalCobradoPorFer);
  const totalCobradoPorFlor = new Intl.NumberFormat("de-DE").format(resumen.totalCobradoPorFlor);
  const sociaQueDebePagar = datosExtracto.sociaQueDebe;
  const sociaAdeudada = datosExtracto.sociaAdeudada;
  const saldoAdeudado = new Intl.NumberFormat("de-DE").format(datosExtracto.montoAdeudado);
  const textoQuienDebePagar = datosExtracto.montoAdeudado !== 0 ? `🤲 ${sociaQueDebePagar} debe pagarle $${saldoAdeudado} a ${sociaAdeudada}` : "🎉🎉  Sus cuentas están saldadas 💃. Nadie debe nada!! 🎉🎉 ";

  return `🧾 Este es el resumen del mes de ${ MESES[resumen.mes]}:

    🏦 <b>Total cobrado en el mes</b>: $${totalCobrado}
    💸 <b>Total pagado en el mes</b>: $${totalPagado}
    
    🏷️ <b>Total cobrado por Fer</b>: $${totalCobradoPorFer}
    🏷️ <b>Total cobrado por Flor</b>: $${totalCobradoPorFlor}
    
    ${textoQuienDebePagar}
  `;
};
