import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesPago} from "../../modules/enums/pago";
import {Socias} from "../../modules/enums/socias";
import {PagoSession, ResumenesPago, ResumenPago} from "../../modules/models/pago";
import {registrarPago} from "../../services/pago-service";
import {MESES} from "../menus/choices";
import DateTime = require("luxon");

const regexMontoPagado = /\d+(,\d{1,2})?/;

/**
 * Necesitamos procesar el flujo de registro de un pago, validando de que ingresaron correctamente
 * los diferentes campos, antes de guardarlo en BD
 *
 * @param {ExtendedContext} ctx
 * @param {PagoSession} pagoEnProceso Actualización en curso
 * @return {Promise}
 */
export async function procesarRegistroPago(ctx: ExtendedContext, pagoEnProceso: PagoSession) {
  const ingresoMonto = pagoEnProceso.monto && pagoEnProceso.motivo == undefined;
  const ingresoMotivo = pagoEnProceso.motivo && pagoEnProceso.asignadoA == undefined;
  const seAsignoElPago = pagoEnProceso.asignadoA && pagoEnProceso.dividieronLaPlata == undefined;
  const dividieronLaPlata = pagoEnProceso.dividieronLaPlata !== undefined && !pagoEnProceso.datosConfirmados;
  const confirmoLosDatos = !!pagoEnProceso.datosConfirmados;

  if (ingresoMonto && pagoEnProceso.monto) {
    const montoEsValido = regexMontoPagado.test(`${pagoEnProceso.monto}`);
    const montoComoNumero: number = +`${pagoEnProceso.monto}`.replace(",", ".");

    if (montoEsValido && montoComoNumero > 0) {
      return guardarPago(ctx, montoComoNumero, PropiedadesPago.MONTO);
    } else {
      await ctx.reply("Si vas a registrar un cobro, asegurate de ingresar sólo números. Te acepto (como mucho) una coma.");
      await ctx.reply("Ingresa nuevamente el monto cobrado, pero hacelo bien esta vez 🙏🏾)");
      return;
    }
  }

  if (ingresoMotivo && pagoEnProceso.motivo) {
    return guardarPago(ctx, pagoEnProceso.motivo, PropiedadesPago.MOTIVO);
  }

  if (seAsignoElPago && pagoEnProceso.asignadoA) {
    return guardarPago(ctx, pagoEnProceso.asignadoA, PropiedadesPago.ASIGNADO_A);
  }

  if (dividieronLaPlata && pagoEnProceso.dividieronLaPlata !== undefined) {
    return guardarPago(ctx, pagoEnProceso.dividieronLaPlata, PropiedadesPago.ESTA_DIVIDIDO);
  }

  if (confirmoLosDatos && pagoEnProceso.datosConfirmados && ctx.scene.session.datosPago) {
    const {datosPago} = ctx.scene.session;
    await ctx.editMessageText(
      `Estoy registrando el pago:
       - <b>Monto</b>: $${new Intl.NumberFormat("de-DE", {minimumFractionDigits: 2}).format(datosPago.monto!)}
       - <b>Motivo</b>: ${datosPago.motivo}
       - <b>¿Quien pagó?</b>: ${datosPago.asignadoA}
       - <b>¿Ya está dividido?</b>: ${datosPago.dividieronLaPlata ? "Si" : "No"}`,
      {
        parse_mode: "HTML",
      }
    );
    guardarPago(ctx, pagoEnProceso.datosConfirmados, PropiedadesPago.CONFIRMACION_DATOS);
    return registrarPago(ctx);
  }
  return;
}

/**
 * Cuando se visualizan los pagos realizados en un mes, estos se presentan en un mensaje que contiene un encabezado
 * y un cuerpo. En el encabezado va el mes al que corresponden los pagos y en el cuerpo van los pagos
 * con toda la información sobre el pago para una facil lectura
 *
 * @param {ResumenesPago} pagosDelMes Todos los pagos correspondientes a un mes
 * @param {number} indiceMesSeleccionado El valor numerico del mes seleccionado en el menu
 * @param {string} anoSeleccionado Año para el cual se seleccionó la visualización de los pagos
 * @return {string}
 */
export const armarTextoPagoMes = (pagosDelMes: ResumenesPago, indiceMesSeleccionado: number, anoSeleccionado: string): string => {
  let cuerpo = "";
  if (pagosDelMes.length < 1) {
    cuerpo = "Todavía no hay pagos para el mes seleccionado";
  } else {
    pagosDelMes.forEach((pago) => {
      cuerpo += armarResumenPago(pago);
    });
  }

  const encabezado = `🧾 Estos son los pagos del mes de ${MESES[indiceMesSeleccionado - 1]} del ${anoSeleccionado}:`;

  return `${encabezado}
  ${cuerpo}.`;
};

const guardarPago = (context: ExtendedContext, valorAGuardar: any, propiedadAGuardar: PropiedadesPago) => {
  let {datosPago} = context.scene.session;
  if (datosPago) {
    switch (propiedadAGuardar) {
    case PropiedadesPago.MONTO:
      datosPago = {...datosPago, monto: valorAGuardar as number};
      break;
    case PropiedadesPago.MOTIVO:
      datosPago = {...datosPago, motivo: valorAGuardar as string};
      break;
    case PropiedadesPago.ASIGNADO_A:
      datosPago = {...datosPago, asignadoA: valorAGuardar as Socias};
      break;
    case PropiedadesPago.ESTA_DIVIDIDO:
      datosPago = {...datosPago, dividieronLaPlata: valorAGuardar as boolean};
      break;
    case PropiedadesPago.CONFIRMACION_DATOS:
      datosPago = {...datosPago, datosConfirmados: valorAGuardar as boolean};
      break;

    default:
      break;
    }
  }
  context.scene.session.datosPago = datosPago;
  return true;
};

/**
 * Al visualizar los pagos de un mes en particular, debemos preparar el pago como viene de firestore
 * a un mensaje con el formato que permita visualizar la información del pago de una manera mas clara
 *
 * @param {ResumenPago} pago A partir del cual armar el texto
 * @return {string}
 */
const armarResumenPago = (pago: ResumenPago): string => {
  const pagoAsNumber = +pago.monto!;
  const fechaDatetime = DateTime.DateTime.fromMillis(pago.fechaPago.toMillis()).toLocaleString({locale: "es-AR"});

  return ` 
  -----------------------------
  <b>Fecha:</b> ${fechaDatetime}
  <b>Monto</b>: $${new Intl.NumberFormat("de-DE").format(pagoAsNumber)};
  <b>Motivo</b>: ${pago.esSaldo ? "Saldo deuda" : pago.motivo ?? ""}
  <b>Lo registró</b>: ${pago.registradoPor}
  <b>¿Es saldo de deuda?</b>: ${pago.esSaldo ? "Si" : "No"}
  ${!pago.esSaldo ? `<b>¿Está dividido?</b>: ${pago.dividieronLaPlata ? "Si" : "No"}` : ""}
  ${!pago.esSaldo ? `<b>Pagó</b>: ${pago.asignadoA}` : ""}
  `;
};
