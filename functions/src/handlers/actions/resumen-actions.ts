import {ExtendedContext} from "../../../config/context/myContext";
import {Socias} from "../../modules/enums/socias";
import {ResumenFirestore} from "../../modules/models/resumen";
import {ExtractoResumen} from "../../modules/models/saldoResumen";
import {formatearValorComoDinero} from "../../modules/utils/formatos";
import {getResumenByUID} from "../../services/resumen-service";
import {MESES} from "../menus/choices";

/**
 * Una vez seleccionado el resumen, debemos presentarlo y enviarselo al usuario.
 *
 * @param {ExtendedContext} ctx contexto
 * @param {string} resumenUID del cliente al que se le registra el cobro
 * @param {any[]} resumenesAnteriores que serviran para calcular la deuda
 * @return {Promise}
 */
export async function armarResumen(ctx: ExtendedContext, resumenUID: string): Promise<string> {
  const resumenAPresentar: ResumenFirestore = await getResumenByUID(resumenUID);
  const datosExtracto = obtenerDatosExtracto(resumenAPresentar);

  ctx.session.datosSaldoMensual = {
    resumenASaldar: resumenAPresentar,
    sociaQueAdeuda: datosExtracto.sociaQueDebe,
    montoAdeudado: datosExtracto.montoAdeudado,
  };
  const cuerpoMensajeExtracto = armarCuerpoExtracto(resumenAPresentar, datosExtracto);
  return cuerpoMensajeExtracto;
}

/**
 *
 * @param {ResumenFirestore} resumen
 * @return {Promise<string>}
 */
export function armarMiniResumenSaldoDeuda(resumen: ResumenFirestore): string {
  const datosExtracto = obtenerDatosExtracto(resumen);
  const {sociaQueDebe, sociaAdeudada, montoAdeudado} = datosExtracto;

  const cabeceraResumen = `${MESES[resumen.mes]}  ${resumen.year}`;
  const cuerpoMensaje = `💸  ${sociaQueDebe} debe ${formatearValorComoDinero(montoAdeudado)} a ${sociaAdeudada}`;
  // const cuerpoMensajeExtracto = armarCuerpoExtracto(resumenAPresentar, datosExtracto);
  return `
  ${cabeceraResumen}
  ------
  ${cuerpoMensaje}.
  `;
}


/**
 * A partir del resumen seleccionado para presentar al usuario, se deben obtener los valores
 * con los que se presentará el extracto
 *
 * @param {ResumenFirestore} resumen a partir del cual obtener los datos
 * @return {string} Cuerpo del mensaje final que se le enviará al usuario
 */
export const obtenerDatosExtracto = (resumen: ResumenFirestore): ExtractoResumen => {
  // llevar saldos a cero
  const {florDebeAFer, ferDebeAFlor} = resumen;
  const sociaQueDebe: Socias = florDebeAFer > ferDebeAFlor ? Socias.FLOR : Socias.FER;
  const sociaAdeudada: Socias = sociaQueDebe == Socias.FLOR ? Socias.FER : Socias.FLOR;
  const montoAdeudado: number = sociaQueDebe == Socias.FLOR ? florDebeAFer - ferDebeAFlor : ferDebeAFlor - florDebeAFer;
  const saldado: boolean = resumen.saldado ? resumen.saldado : false;
  return {
    montoAdeudado,
    sociaAdeudada,
    sociaQueDebe,
    saldado,
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
  const mitadDeLoPagado = resumen.totalPagado / 2;
  const totalCobradoPorFer = new Intl.NumberFormat("de-DE").format(resumen.totalCobradoPorFer);
  const totalCobradoPorFlor = new Intl.NumberFormat("de-DE").format(resumen.totalCobradoPorFlor);
  const correspondeACadaSocia = new Intl.NumberFormat("de-DE").format(resumen.correspondeACadaSocia);
  const sociaQueDebePagar = datosExtracto.sociaQueDebe;
  const sociaAdeudada = datosExtracto.sociaAdeudada;
  const saldoAdeudado = new Intl.NumberFormat("de-DE").format(datosExtracto.montoAdeudado);
  const textoQuienDebePagar = !datosExtracto.saldado ? `🤲 ${sociaQueDebePagar} debe pagarle $${saldoAdeudado} a ${sociaAdeudada}` : "🎉🎉  Sus cuentas están saldadas 💃. Nadie debe nada!! 🎉🎉 ";
  const sueldoNeto = new Intl.NumberFormat("de-DE").format(resumen.correspondeACadaSocia - mitadDeLoPagado);

  return `🧾 Este es el resumen del mes de ${MESES[resumen.mes]}:

    🏦 <b>Total cobrado en el mes</b>: $${totalCobrado}
    💸 <b>Total pagado en el mes</b>: $${totalPagado}
    
    🏷️ <b>Total cobrado por Fer</b>: $${totalCobradoPorFer}
    🏷️ <b>Total cobrado por Flor</b>: $${totalCobradoPorFlor}
    
    💵 <b>Sueldo bruto de ambas: </b>: $${correspondeACadaSocia}
    💵 <b>Sueldo neto de ambas: </b>: $${sueldoNeto}

    ${textoQuienDebePagar}
  `;
};
