import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesPago} from "../../modules/enums/pago";
import {Socias} from "../../modules/enums/socias";
import {PagoSession} from "../../modules/models/pago";
import {registrarPago} from "../../services/pago-service";
const regexMontoPagado = /\d+(,\d{1,2})?/;

/**
 * Necesitamos procesar el flujo de registro de un pago, validando de que ingresaron correctamente
 * los diferentes campos, antes de guardarlo en BD
 *
 * @param {ExtendedContext} ctx
 * @param {PagoSession} pagoEnProceso Actualización en curso
 * @return {Promise}
 */
export async function procesarRegistroPago( ctx: ExtendedContext, pagoEnProceso: PagoSession) {
  const ingresoMonto = pagoEnProceso.monto && pagoEnProceso.motivo == undefined;
  const ingresoMotivo = pagoEnProceso.motivo && pagoEnProceso.asignadoA == undefined;
  const seAsignoElPago = pagoEnProceso.asignadoA && pagoEnProceso.dividieronLaPlata == undefined;
  const dividieronLaPlata = pagoEnProceso.dividieronLaPlata !== undefined && !pagoEnProceso.datosConfirmados;
  const confirmoLosDatos = !!pagoEnProceso.datosConfirmados;

  if (ingresoMonto && pagoEnProceso.monto) {
    const montoEsValido = regexMontoPagado.test(`${pagoEnProceso.monto}`);
    const montoComoNumero: number = +`${pagoEnProceso.monto}`.replace(",", ".");

    if (montoEsValido && montoComoNumero> 0) {
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

  if (dividieronLaPlata && pagoEnProceso.dividieronLaPlata !== undefined ) {
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
