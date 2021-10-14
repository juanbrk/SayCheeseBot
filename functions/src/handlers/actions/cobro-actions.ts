import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesCobro} from "../../modules/enums/cobro";
import {Socias} from "../../modules/enums/socias";
import {ClienteAsEntity} from "../../modules/models/cliente";
import {ResumenCobro, ResumenesCobro} from "../../modules/models/cobro";
import {MyWizardSession, Session} from "../../modules/models/session";
import {getClienteEntity} from "../../services/cliente-service";
import {obtenerCobrosParaMes, registrarCobro} from "../../services/cobro-service";
import {MESES} from "../menus/choices";

import DateTime = require("luxon");

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

/**
 * Luego de que el usuario seleccione un mes para el que visualizar todos los cobros, se le deben mostrar
 * los cobros del mes en un mensaje.
 *
 * @param {ExtendedContext} ctx context
 * @param {string} indiceMes mes elegido en el menu
 * @return {string}
 */
export async function presentarCobrosMes(ctx: ExtendedContext, indiceMes: string): Promise<string> {
  const cobrosMesSeleccionado = await obtenerCobrosParaMes(indiceMes);
  const cuerpoMensajeCobros = armarTextoCobroMes(cobrosMesSeleccionado, +indiceMes);
  return cuerpoMensajeCobros;
}

/**
 * Cuando se visualizan los cobros de un mes, estos se presentan en un mensaje que contiene un encabezado
 * y un cuerpo. En el encabezado va el mes al que corresponden los cobros y en el cuerpo van los cobros
 * con toda la información sobre el cobro para una facil lectura
 *
 * @param {ResumenesCobro} cobrosDelMes Todos los cobros correspondientes a un mes
 * @param {number} indiceMesSeleccionado El valor numerico del mes seleccionado en el menu
 * @return {string}
 */
const armarTextoCobroMes = (cobrosDelMes: ResumenesCobro, indiceMesSeleccionado: number): string => {
  let cuerpo = "";
  cobrosDelMes.forEach((cobro) => {
    cuerpo += armarResumenCobro(cobro);
  });

  const encabezado = `🧾 Estos son los cobros del mes de ${ MESES[indiceMesSeleccionado-1]}:`;

  return `${encabezado}
  ${cuerpo}.`;
};

/**
 * Al visualizar los cobros de un mes en particular, debemos preparar el cobro como viene de firestore
 * a un mensaje con el formato que permita visualizar la información del cobro de una manera mas clara
 *
 * @param {ResumenCobro} cobro A partir del cual armar el texto
 * @return {string}
 */
const armarResumenCobro = (cobro: ResumenCobro) : string => {
  const cobroAsNumber = +cobro.monto!;

  const fechaDatetime = DateTime.DateTime.fromMillis(cobro.fechaCobro.toMillis()).toLocaleString({locale: "es-AR"});

  return ` 
  -----------------------------
  <b>Fecha:</b> ${fechaDatetime}
  <b>Monto</b>: $${new Intl.NumberFormat("de-DE").format(cobroAsNumber)};
  <b>Motivo</b>: ${cobro.motivo}
  <b>Quien lo hizo</b>: ${cobro.registradoPor}
  <b>¿Está dividido?</b>: ${cobro.dividieronLaPlata ? "Si" : "No"}
  `;
};
