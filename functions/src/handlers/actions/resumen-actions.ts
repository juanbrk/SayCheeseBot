import {ExtendedContext} from "../../../config/context/myContext";
import {ResumenFirestore} from "../../modules/models/resumen";
import {ExtractoResumen} from "../../modules/models/saldoResumen";
import {getResumenByUID} from "../../services/resumen-service";
import {MESES} from "../menus/choices";

/**
 * Una vez seleccionado el resumen, debemos presentarlo y enviarselo al usuario
 *
 * @param {ExtendedContext} ctx contexto
 * @param {string} resumenUID del cliente al que se le registra el cobro
 * @return {Promise}
 */
export async function presentarResumen(ctx: ExtendedContext, resumenUID: string): Promise<any> {
  let resumenAPresentar: ResumenFirestore;
  const {resumenes} = ctx.session;
  if (resumenes) {
    resumenAPresentar = resumenes.find((resumen, _) => resumen.uid == resumenUID) as ResumenFirestore;
  } else {
    resumenAPresentar = await getResumenByUID(resumenUID);
  }
  // GENERAR MENSAJE
  const datosExtracto = obtenerDatosExtracto(resumenAPresentar);
  const cuerpoMensajeExtracto = armarCuerpoExtracto(resumenAPresentar, datosExtracto);

  return ctx.editMessageText(cuerpoMensajeExtracto);
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
  const sociaQueDebe: string = florDebeAFer > ferDebeAFlor? "Flor" : "Fer";
  const sociaAdeudada: string = sociaQueDebe == "Flor" ? "Fer" : "Flor";
  const saldoAdeudado: number = sociaQueDebe == "Flor" ? florDebeAFer - ferDebeAFlor : ferDebeAFlor - florDebeAFer;
  // obtener monto adeudado
  return {
    saldoAdeudado,
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
  const loQueLeCorrespondeACadaSocia = new Intl.NumberFormat("de-DE").format(resumen.correspondeACadaSocia);
  const sociaQueDebePagar = datosExtracto.sociaQueDebe;
  const sociaAdeudada = datosExtracto.sociaAdeudada;
  const saldoAdeudado = new Intl.NumberFormat("de-DE").format(datosExtracto.saldoAdeudado);

  return `🧾 Este es el resumen del mes de ${ MESES[resumen.mes]}:

    💰 Total cobrado: $${totalCobrado}
    🏷️ Cantidad de cobros: ${resumen.cantidadDeCobros}
    💸 A ambas les corresponde: $${loQueLeCorrespondeACadaSocia}
    ✅ ${sociaQueDebePagar} debe pagarle $${saldoAdeudado} a ${sociaAdeudada}
  `;
};
