import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesCobro} from "../../modules/enums/cobro";
import {Socias} from "../../modules/enums/socias";
import {ClienteAsEntity} from "../../modules/models/cliente";
import {MyWizardSession, Session} from "../../modules/models/session";
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
  const session: Session = ctx.session;
  if (ctx.callbackQuery && ctx.callbackQuery.message) {
    session.cobro = {
      cliente: cliente,
      datosConfirmados: false,
      registradoPor: ctx.callbackQuery.from.first_name,
    };
  }
  ctx.session = session;
  return cliente;
}

/**
 * Necesitamos procesar el flujo de cobro a un cliente y aseguurarnos de que ingresó correctamente
 * el monto y motivo, antes de guardarlo en BD
 *
 * @param {ExtendedContext} ctx Actualización en curso
 * @param {string|boolean} valorAguardar Si se interactuó con un inline button, vendrá el valor de la propiedad a guardar
 *  string en la asignación
 *  boolean en la division
 */
export async function procesarRegistroCobro(ctx: ExtendedContext, valorAguardar?: Socias|boolean) {
  const {session} = ctx.scene;
  if (ctx.message && session.datosCobro) {
    const ingresoMonto = session.datosCobro.monto && !session.datosCobro.motivo;
    const ingresoMotivo = session.datosCobro.motivo && !session.datosCobro.asignadoA;

    if (ingresoMonto && session.datosCobro && "text" in ctx.message) {
      const montoEsValido = regexMontoPagado.test(ctx.message.text);
      const montoComoNumero: number = +(ctx.message.text.replace(",", "."));
      if (montoEsValido && montoComoNumero> 0) {
        return guardarPropiedadCobro(ctx, session, PropiedadesCobro.MONTO);
      } else {
        await ctx.reply("Si vas a registrar un cobro, asegurate de ingresar sólo números. Te acepto (como mucho) una coma.");
        await ctx.reply("Ingresa nuevamente el monto cobrado, pero hacelo bien esta vez 🙏🏾)");
        return;
      }
    }

    if (ingresoMotivo) {
      return guardarPropiedadCobro(ctx, session, PropiedadesCobro.MOTIVO);
    }
  } else if (ctx.callbackQuery && session.datosCobro) {
    const realizoAsignacion = typeof valorAguardar === "string";
    const registraronDivision =typeof valorAguardar === "boolean";
    const losDatosSonCorrectos = session.datosCobro.datosConfirmados;

    if (realizoAsignacion && valorAguardar) {
      return guardarPropiedadCobro(ctx, session, PropiedadesCobro.ASIGNADO_A, valorAguardar);
    }

    if (registraronDivision && valorAguardar) {
      return guardarPropiedadCobro(ctx, session, PropiedadesCobro.ESTA_DIVIDIDO, valorAguardar);
    }

    if (losDatosSonCorrectos) {
      await ctx.reply("Estoy registrando el cobro");
      guardarPropiedadCobro(ctx, session, PropiedadesCobro.REGISTRADO_POR);
      return registrarCobro(ctx);
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
 * @param {string|boolean} valorAguardar viene unicamente si en el paso se presionó un botón.
 *    string en la asignación
 *    boolean en la division
 * @return {boolean}
 */
function guardarPropiedadCobro(ctx: ExtendedContext, sessionActual: MyWizardSession, propiedadAGuardar: PropiedadesCobro, valorAguardar?: Socias | boolean) {
  if (
    sessionActual.datosCobro &&
    (ctx.message && "text" in ctx.message)
  ) {
    switch (propiedadAGuardar) {
    case PropiedadesCobro.MONTO: {
      const montoFormateado: number = +(ctx.message.text.replace(",", "."));
      sessionActual.datosCobro = {
        ...sessionActual.datosCobro,
        monto: montoFormateado,
      };
      break;
    }
    case PropiedadesCobro.MOTIVO:
      sessionActual.datosCobro.motivo = ctx.message.text;
      break;
    default:
      break;
    }
  } else if (
    sessionActual.datosCobro &&
    (ctx.callbackQuery && "data" in ctx.callbackQuery) &&
    valorAguardar
  ) {
    switch (propiedadAGuardar) {
    case PropiedadesCobro.ASIGNADO_A:
      if (typeof valorAguardar === "string") {
        sessionActual.datosCobro.asignadoA = valorAguardar;
      }
      break;
    case PropiedadesCobro.ESTA_DIVIDIDO:
      sessionActual.datosCobro.dividieronLaPlata = true;
      break;

    default:
      break;
    }
  }
  ctx.scene.session.datosCobro = sessionActual.datosCobro;
  return true;
}
