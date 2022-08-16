import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesPago} from "../../modules/enums/pago";
import {Socias} from "../../modules/enums/socias";
import {SaldoDeudaWizardSession} from "../../modules/models/saldoDeuda";
import functions = require("firebase-functions");
import {registrarSaldo} from "../../services/resumen-service";
/**
 * Necesitamos procesar el flujo de registro de un pago para saldar deudas, validando de que ingresaron correctamente
 * los diferentes campos, antes de guardarlo en BD
 *
 * @param {ExtendedContext} ctx
 * @param {SaldoDeudaWizardSession} saldoEnProceso Actualización en curso
 * @return {Promise}
 */
export async function procesarRegistroSaldo(ctx: ExtendedContext, saldoEnProceso: SaldoDeudaWizardSession) {
  const seInicioElRegistro = saldoEnProceso.registradoPor && saldoEnProceso.asignadoA == undefined;
  const seAsignoElPago = saldoEnProceso.asignadoA && saldoEnProceso.monto == undefined;
  const seIngresoElMonto = saldoEnProceso.monto && !saldoEnProceso.datosConfirmados;
  const seConfirmoElRegistro = saldoEnProceso.datosConfirmados == true;

  if (seInicioElRegistro) {
    return guardarPago(ctx, saldoEnProceso.registradoPor, PropiedadesPago.REGISTRADO_POR);
  }
  if (seAsignoElPago && saldoEnProceso.asignadoA) {
    return guardarPago(ctx, saldoEnProceso.asignadoA, PropiedadesPago.ASIGNADO_A);
  }
  if (seIngresoElMonto && saldoEnProceso.monto) {
    const {monto: montoIngresado} = saldoEnProceso;
    const {montoAdeudado} = saldoEnProceso;
    const saldoRestante = montoAdeudado - montoIngresado;

    if ( montoIngresado < 0 ) {
      await ctx.reply("Por favor, ingresá nuevamente un monto válido");
      return;
    } else if (montoIngresado > montoAdeudado) {
      const totalAdeudadoFormateado = new Intl.NumberFormat("de-DE").format(saldoEnProceso.montoAdeudado);
      await ctx.reply(`Ingresaste un valor mayor a lo que le debés. Ingresá un valor menor a $${totalAdeudadoFormateado} esta vez.`);
      return;
    }

    guardarPago(ctx, saldoRestante, PropiedadesPago.SALDO_RESTANTE);
    return guardarPago(ctx, montoIngresado, PropiedadesPago.MONTO);
  }
  if (seConfirmoElRegistro && saldoEnProceso.datosConfirmados) {
    const {monto: montoIngresado} = saldoEnProceso;
    const {montoAdeudado} = saldoEnProceso;
    const montoIngresadoFormateado = new Intl.NumberFormat("de-DE").format(montoIngresado!);
    const saldoRestante = montoAdeudado - montoIngresado!;
    const saldoRestanteFormateado = new Intl.NumberFormat("de-DE").format(saldoRestante);

    await ctx.editMessageText(
      `Estoy registrando el pago:
         - <b>Monto Saldado</b>: $${montoIngresadoFormateado}
         - <b>¿Quien pagó?</b>: ${saldoEnProceso.asignadoA}
         - <b>Saldo restante:</b> $${saldoRestanteFormateado}`,
      {
        parse_mode: "HTML",
      }
    );
    guardarPago(ctx, saldoEnProceso.datosConfirmados, PropiedadesPago.CONFIRMACION_DATOS);
    return registrarSaldo(ctx);
  }
  return;
}

/**
 *
 * @param {ExtendedContext} context actualizacion en curso
 * @param {any} valorAGuardar en ctx.scene.session.datosSaldo
 * @param {PropiedadesPago} propiedadAGuardar para ctx.scene.session.datosSaldo
 * @return {boolean}
 */
const guardarPago = (context: ExtendedContext, valorAGuardar: any, propiedadAGuardar: PropiedadesPago) => {
  functions.logger.log("GUARDAR PAGO VALOR A GUARDAR", valorAGuardar);
  functions.logger.log("GUARDAR PAGO PROPIEDAD A GUARDAR", propiedadAGuardar);
  let {datosSaldoDeuda} = context.scene.session;
  if (datosSaldoDeuda) {
    switch (propiedadAGuardar) {
    case PropiedadesPago.ASIGNADO_A:
      datosSaldoDeuda = {...datosSaldoDeuda, asignadoA: valorAGuardar as Socias};
      break;
    case PropiedadesPago.SALDO_RESTANTE:
      datosSaldoDeuda = {...datosSaldoDeuda, saldoRestante: valorAGuardar as number};
      break;
    case PropiedadesPago.MONTO:
      datosSaldoDeuda = {...datosSaldoDeuda, monto: valorAGuardar as number};
      break;
    case PropiedadesPago.CONFIRMACION_DATOS:
      datosSaldoDeuda = {...datosSaldoDeuda, datosConfirmados: valorAGuardar as boolean};
      break;
    default:
      break;
    }
  } else {
    if (context.session.datosSaldoMensual && propiedadAGuardar == PropiedadesPago.REGISTRADO_POR) {
      datosSaldoDeuda = {...context.session.datosSaldoMensual, datosConfirmados: false, registradoPor: valorAGuardar};
    }
  }
  context.scene.session.datosSaldoDeuda = datosSaldoDeuda;
  return true;
};
