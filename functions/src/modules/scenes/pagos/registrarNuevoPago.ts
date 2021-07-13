import {Composer, Markup, Scenes} from "telegraf";
import {ExtendedContext} from "../../../../config/context/myContext";
import {procesarRegistroPago} from "../../../handlers/actions/pagos-actions";
import {TipoPago} from "../../enums/pago";
import {Socias} from "../../enums/socias";
import {PagoSession} from "../../models/pago";
import {avanzar, repetirPaso, solicitarIngresoMenu} from "../general";

import functions = require("firebase-functions");

const obtenerMonto = async (ctx: ExtendedContext) => {
  if (ctx.scene.session.datosPago) {
    ctx.scene.session.datosPago = {...ctx.scene.session.datosPago};
  }
  ctx.scene.session.datosPago = {
    datosConfirmados: false,
    registradoPor: `${ctx.callbackQuery!.from.first_name}`,
  };

  ctx.editMessageText("Ingresa el monto pagado:");
  return avanzar(ctx);
};

/**
  * Valida el nombre ingresado y solicita el ingreso del telefono
  */
const validarMontoYObtenerMotivo = new Composer<ExtendedContext>();
validarMontoYObtenerMotivo.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

validarMontoYObtenerMotivo.on("message", async (ctx: any) => {
  const {text: montoIngresado} = ctx.message;
  functions.logger.log("MESSAGE", ctx.message);
  if (montoIngresado.length < 2 ) {
    await ctx.reply("Por favor, ingresá nuevamente un monto válido");
    return repetirPaso(ctx);
  }
  const pago: PagoSession = {
    ...ctx.scene.session.datosPago,
    monto: montoIngresado,
  };
  const guardarMonto = await procesarRegistroPago(ctx, pago);
  if (!guardarMonto) {
    return repetirPaso(ctx);
  }
  await ctx.reply("¿Qué pagaste?");
  return avanzar(ctx);
});

validarMontoYObtenerMotivo.command("salir", async (ctx) => {
  await ctx.reply("Cancelaste el registro del pago");
  return leaveScene(ctx);
});


/**
  * Valida el nombre ingresado y solicita el ingreso del telefono
  */
const validarMotivoYSolicitarAsignacion = new Composer<ExtendedContext>();
validarMotivoYSolicitarAsignacion.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));


validarMotivoYSolicitarAsignacion.on("message", async (ctx: any) => {
  const {text: motivoIngresado} = ctx.message;
  if (motivoIngresado.length < 2 ) {
    await ctx.reply("Por favor, ingresa un motivo por el pago que despues no sabemos que pagaste");
    return repetirPaso(ctx);
  }
  const pago: PagoSession = {
    ...ctx.scene.session.datosPago,
    motivo: motivoIngresado,
  };
  const guardarMonto = await procesarRegistroPago(ctx, pago);
  if (!guardarMonto) {
    return repetirPaso(ctx);
  }
  await ctx.reply(
    "¿Quien hizo el pago?",
    Markup.inlineKeyboard([
      Markup.button.callback("Fer", "pagoFer"),
      Markup.button.callback("Flor", "pagoFlor"),
    ]));
  return avanzar(ctx);
});


/**
 * Valida la asignación del cobro y pregunta si se dividió el pago
 */
const validarAsignacionYSolicitarTipoPago = new Composer<ExtendedContext>();
validarAsignacionYSolicitarTipoPago.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

validarAsignacionYSolicitarTipoPago.on("message", async (ctx: any) => {
  await ctx.reply("Por favor, selecciona una de las socias para dejar asentado quien cobro la plata");
  await ctx.reply(
    "¿Quién hizo el pago?",
    Markup.inlineKeyboard([
      Markup.button.callback("Fer", "pagoFer"),
      Markup.button.callback("Flor", "pagoFlor"),
    ])); (ctx);
  return ctx.wizard.selectStep(3);
});

validarAsignacionYSolicitarTipoPago.action("pagoFer", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosPago) {
    const pago: PagoSession = {
      ...ctx.scene.session.datosPago,
      asignadoA: Socias.FER,
    };
    const registrarAsignacion = await procesarRegistroPago(ctx, pago);
    if (!registrarAsignacion) {
      return repetirPaso(ctx);
    }

    await ctx.editMessageText(
      "¿Pagaste algo para saycheese o es por otra cosa?",
      Markup.inlineKeyboard([
        Markup.button.callback("Es de say cheese", "sayCheese"),
        Markup.button.callback("Es otra cosa", "varios"),
      ]));
    return avanzar(ctx);
  }
});

validarAsignacionYSolicitarTipoPago.action("pagoFlor", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosPago) {
    const pago: PagoSession = {
      ...ctx.scene.session.datosPago,
      asignadoA: Socias.FLOR,
    };
    const registrarAsignacion = await procesarRegistroPago(ctx, pago);
    if (!registrarAsignacion) {
      return repetirPaso(ctx);
    }

    await ctx.editMessageText(
      "¿Pagaste algo para saycheese o es por otra cosa?",
      Markup.inlineKeyboard([
        Markup.button.callback("Es de say cheese", "sayCheese"),
        Markup.button.callback("Es otra cosa", "varios"),
      ]));
    return avanzar(ctx);
  }
});


/**
 * Valida la asignación del cobro y pregunta si se dividió el pago
 */
const validarTipoYSolicitarDivision = new Composer<ExtendedContext>();
validarTipoYSolicitarDivision.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

validarTipoYSolicitarDivision.on("message", async (ctx: any) => {
  await ctx.reply("Por favor, elegí el tipo de pago que realizaron");
  await ctx.reply(
    "¿Pagaste algo para saycheese o es por otra cosa?",
    Markup.inlineKeyboard([
      Markup.button.callback("Es de say cheese", "sayCheese"),
      Markup.button.callback("Es otra cosa", "varios"),
    ]));
  return ctx.wizard.selectStep(3);
});

validarTipoYSolicitarDivision.action("sayCheese", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosPago) {
    const pago: PagoSession = {
      ...ctx.scene.session.datosPago,
      tipoPago: TipoPago.SAY_CHEESE,
    };

    const registrarTipoPago = await procesarRegistroPago(ctx, pago);
    if (!registrarTipoPago) {
      await ctx.editMessageText(
        "¿Pagaste algo para saycheese o es por otra cosa?",
        Markup.inlineKeyboard([
          Markup.button.callback("Es de say cheese", "sayCheese"),
          Markup.button.callback("Es otra cosa", "varios"),
        ]));
      return ctx.wizard.selectStep(4);
    }

    await ctx.editMessageText(
      "¿Ya se pagaron entre ustedes?",
      Markup.inlineKeyboard([
        Markup.button.callback("Si", "pagoDividido"),
        Markup.button.callback("No", "pagoSinDividir"),
      ]));
    return avanzar(ctx);
  }
});


validarTipoYSolicitarDivision.action("varios", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosPago) {
    const pago: PagoSession = {
      ...ctx.scene.session.datosPago,
      tipoPago: TipoPago.VARIOS,
    };
    const registrarTipoPago = await procesarRegistroPago(ctx, pago);
    if (!registrarTipoPago) {
      await ctx.editMessageText(
        "¿Pagaste algo para saycheese o es por otra cosa?",
        Markup.inlineKeyboard([
          Markup.button.callback("Es de say cheese", "sayCheese"),
          Markup.button.callback("Es otra cosa", "varios"),
        ]));
      return repetirPaso(ctx);
    }

    await ctx.editMessageText(
      "¿Ya se pagaron entre ustedes?",
      Markup.inlineKeyboard([
        Markup.button.callback("Si", "pagoDividido"),
        Markup.button.callback("No", "pagoSinDividir"),
      ]));
    return avanzar(ctx);
  }
});

/**
 * Valida la asignación del cobro y pregunta si se dividió el pago
 */
const validarDivisionYSolicitarConfirmacion = new Composer<ExtendedContext>();
validarDivisionYSolicitarConfirmacion.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
/**
 * Sólo si el pago ya lo dividieron se guardará la propiedad, no vale la pena hacerlo
 * si no se dividió
 */
validarDivisionYSolicitarConfirmacion.action("pagoDividido", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosPago) {
    const pago: PagoSession = {
      ...ctx.scene.session.datosPago,
      dividieronLaPlata: true,
    };
    const registroDivision = await procesarRegistroPago(ctx, pago);
    if (registroDivision) {
      const {datosPago} = ctx.scene.session;
      await ctx.editMessageText(
        `Confirmá si los datos son correctos:
         - <b>Monto</b>: $${new Intl.NumberFormat("de-DE", {minimumFractionDigits: 2}).format(datosPago.monto!)}
         - <b>Motivo</b>: ${datosPago.motivo}
         - <b>¿Quien pagó?</b>: ${datosPago.asignadoA}
         - <b>¿Es de Say Cheese?</b>: ${datosPago.tipoPago == TipoPago.SAY_CHEESE ? "Si" : "No"}
         - <b>¿Ya está dividido?</b>: Si

         ¿Los datos son correctos?`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{text: "Si, registrar pago", callback_data: "registrar"}],
              [{text: "No, reiniciar registro", callback_data: "recomenzarRegistro"}],
            ],
          },
        }
      );
      return avanzar(ctx);
    } else {
      await ctx.editMessageText("Algo salió mal, volvé a elegir");
      await ctx.reply(
        "¿Ya se pagaron entre ustedes?",
        Markup.inlineKeyboard([
          Markup.button.callback("Si", "pagoDividido"),
          Markup.button.callback("No", "pagoSinDividir"),
        ]));
      return repetirPaso(ctx);
    }
  }
});

/**
 * Sólo si el pago ya lo dividieron se guardará la propiedad, no vale la pena hacerlo
 * si no se dividió
 */
validarDivisionYSolicitarConfirmacion.action("pagoSinDividir", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosPago) {
    const {datosPago} = ctx.scene.session;
    if (datosPago) {
      await ctx.editMessageText(
        `Confirmá si los datos son correctos:
           - <b>Monto</b>: $${new Intl.NumberFormat("de-DE", {minimumFractionDigits: 2}).format(datosPago.monto!)}
           - <b>Motivo</b>: ${datosPago.motivo}
           - <b>¿Quien pagó?</b>: ${datosPago.asignadoA}
           - <b>¿Es de Say Cheese?</b>: ${datosPago.tipoPago == TipoPago.SAY_CHEESE ? "si" : "no"}
           - <b>¿Ya está dividido?</b>: No
  
           ¿Los datos son correctos?`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{text: "Si, registrar pago", callback_data: "registrar"}],
              [{text: "No, reiniciar registro", callback_data: "recomenzarRegistro"}],
            ],
          },
        }
      );
      return avanzar(ctx);
    } else {
      await ctx.editMessageText("Algo salió mal, por favor volvé a elegir");
      await ctx.reply(
        "¿Ya se pagaron entre ustedes?",
        Markup.inlineKeyboard([
          Markup.button.callback("Si", "pagoDividido"),
          Markup.button.callback("No", "pagoSinDividir"),
        ]));
      return repetirPaso(ctx);
    }
  }
});


validarDivisionYSolicitarConfirmacion.on("message", async (ctx: any) => {
  await ctx.reply("Por favor, elegí una opción");
  await ctx.reply(
    "¿Ya se pagaron entre ustedes?",
    Markup.inlineKeyboard([
      Markup.button.callback("Si", "pagoDividido"),
      Markup.button.callback("No", "pagoSinDividir"),
    ]));
  return ctx.wizard.selectStep(5);
});

const validarConfirmaciónYRegistrarPago = new Composer<ExtendedContext>();
validarConfirmaciónYRegistrarPago.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

validarConfirmaciónYRegistrarPago.action("registrar", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosPago) {
    const pago: PagoSession = {
      ...ctx.scene.session.datosPago,
      registradoPor: ctx.callbackQuery.from.first_name,
      datosConfirmados: true,
    };
    await procesarRegistroPago(ctx, pago);
  }
  delete ctx.scene.session.datosPago;
  solicitarIngresoMenu(ctx);
  return ctx.scene.leave();
});

validarConfirmaciónYRegistrarPago.action("recomenzarRegistro", async (ctx: ExtendedContext) => {
  await ctx.editMessageText("Vamos de nuevo entonces");
  ctx.scene.session.datosPago = {
    datosConfirmados: false,
    registradoPor: `${ctx.callbackQuery!.from.first_name}`,
  };
  await ctx.reply("Por favor ingresá el monto del cobro:");
  return ctx.wizard.selectStep(1);
});

export const wizardNuevoPago = new Scenes.WizardScene(
  "nuevo-pago-wizard",
  obtenerMonto,
  validarMontoYObtenerMotivo,
  validarMotivoYSolicitarAsignacion,
  validarAsignacionYSolicitarTipoPago,
  validarTipoYSolicitarDivision,
  validarDivisionYSolicitarConfirmacion,
  validarConfirmaciónYRegistrarPago
);

const leaveScene = async (ctx: any) => {
  await ctx.reply("Cancelaste el registro de un nuevo pago. Se borraron todos los datos.");
  solicitarIngresoMenu(ctx);
  delete ctx.session.cobro;
  return ctx.scene.leave();
};


