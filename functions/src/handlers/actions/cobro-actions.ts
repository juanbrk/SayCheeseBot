import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesCobro} from "../../modules/enums/cobro";
import {ClienteAsEntity} from "../../modules/models/cliente";
import {Session} from "../../modules/models/session";
import {getClienteEntity} from "../../services/cliente-service";
import {registrarCobro} from "../../services/cobro-service";

const regexMontoPagado = /\d+(,\d{1,2})?/;

/**
 * Una vez seleccionado el cliente, se inicia el proceso de registro de cobro ingresando el monto cobrado
 * @param {ExtendedContext} ctx contexto
 * @param {string} clienteUID del cliente al que se le registra el cobro
 * @return {Promise}
 */
export async function iniciarCobroCliente(ctx: ExtendedContext, clienteUID: string) {
  const cliente: ClienteAsEntity = await getClienteEntity(clienteUID);
  const session: Session = await ctx.session;
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    session.cobro = {
      registrandoNuevoCobro: true,
      cliente: cliente,
      mensajeInicial: ctx.callbackQuery.message.message_id,
    };
  }
  ctx.session = await session;
  return ctx.editMessageText( "Ingresa el monto cobrado:");
}

/**
 * Necesitamos procesar el flujo de cobro a un cliente y aseguurarnos de que ingresó correctamente
 * el monto y motivo, antes de guardarlo en BD
 *
 * @param {ExtendedContext} ctx Actualización en curso
 */
export async function procesarRegistroCobro(ctx: ExtendedContext) {
  const {session} = ctx;
  if (ctx.session.cobro?.mensajeInicial && (ctx.message && "text" in ctx.message)) {
    const {mensajeInicial} = ctx.session.cobro;
    const ingresoMonto = ctx.message.message_id == mensajeInicial + 1;
    const ingresoMotivo = ctx.message.message_id == mensajeInicial + 3;
    if (ingresoMonto) {
      const montoEsValido = regexMontoPagado.test(ctx.message.text);
      if (montoEsValido) {
        await guardarPropiedadCobro(ctx, session, PropiedadesCobro.MONTO);
        return solicitarIngresoMotivoCobro(ctx);
      } else {
        ctx.session.cobro.mensajeInicial = mensajeInicial+3;
        await ctx.reply("Si vas a registrar un cobro, asegurate de ingresar sólo números. Te acepto (como mucho) una coma.");
        return ctx.reply("Ingresa nuevamente el monto cobrado, pero hacelo bien esta vez 🙏🏾)");
      }
    } else if (ingresoMotivo) {
      await guardarPropiedadCobro(ctx, session, PropiedadesCobro.MOTIVO);
      await guardarPropiedadCobro(ctx, session, PropiedadesCobro.REGISTRADO_POR);
      presentarInformacionCobro(ctx);
      await registrarCobro(ctx);
      delete ctx.session.cobro;
    }
  }
  return;
}

/**
 * Durante el proceso del registro del cobro iremos guardando las distintas propiedades del mismo, a medida que
 * el cliente las vaya ingresando
 * @param {ExtendedContext} ctx Actualización en curso
 * @param {Session} sessionActual Sesion que contiene el cobro en curso y que actualizaremos con la nueva propiedad
 * @param {string} propiedadAGuardar es la que se agregará en la sesión
 */
function guardarPropiedadCobro(ctx: ExtendedContext, sessionActual: Session, propiedadAGuardar: PropiedadesCobro) {
  if (sessionActual.cobro?.registrandoNuevoCobro && (ctx.message && "text" in ctx.message)) {
    switch (propiedadAGuardar) {
    case PropiedadesCobro.MONTO: {
      const montoFormateado = Number(ctx.message.text.replace(",", "."));
      sessionActual.cobro.monto = montoFormateado;
      break;
    }
    case PropiedadesCobro.MOTIVO:
      sessionActual.cobro.motivo = ctx.message.text;
      break;
    case PropiedadesCobro.REGISTRADO_POR:
      sessionActual.cobro.registradoPor = ctx.message.from.first_name;
      break;
    default:
      break;
    }
  }
  ctx.session = sessionActual;
}

/**
 * Al procesar un cobro, solicitamos al usuairo el ingreso del motivo por el cual realizó el cobro.
 * @param {ExtendedContext} ctx Actualización en curso
 * @return {Promise<Message.TextMessage>} solicitando que ingrese el motivo del cobro
 */
function solicitarIngresoMotivoCobro(ctx: ExtendedContext) {
  return ctx.reply("Ingresá el motivo del cobro:");
}

/**
 * Luego de procesar un cobro en su totalidad, se le presenta al cliente la información
 * que se guardara en la DB
 * @param {ExtendedContext} ctx Actualización en curso
 * @return {Promise<Message.TextMessage>} indicando lo que se guardará en DB
 */
function presentarInformacionCobro(ctx: ExtendedContext) {
  let datosDelCliente= "";
  if (ctx.session.cobro) {
    datosDelCliente ="\n- Cliente: " + ctx.session.cobro.cliente.nombre +
          "\n- Monto: $" + ctx.session.cobro.monto +
          "\n- Motivo: " + ctx.session.cobro.motivo;
  }
  return ctx.reply(`Registrando el cobro con los siguientes datos: ${datosDelCliente}`);
}
