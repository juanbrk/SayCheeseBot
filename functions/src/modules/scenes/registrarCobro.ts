import {Composer, Markup, Scenes} from "telegraf";
import {ExtendedContext} from "../../../config/context/myContext";
import {procesarRegistroCobro} from "../../handlers/actions/cobro-actions";
import {Socias} from "../enums/socias";
import {avanzar, solicitarIngresoMenu, repetirPaso} from "./general";

const obtenerMonto = async (ctx: ExtendedContext) => {
  if (ctx.session.cobro) {
    ctx.scene.session.datosCobro = {...ctx.session.cobro};
  }
  ctx.editMessageText("Ingresa el monto cobrado:");
  return avanzar(ctx);
};

/**
 * Valida el nombre ingresado y solicita el ingreso del telefono
 */
const obtenerMotivo = new Composer<ExtendedContext>();
obtenerMotivo.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

obtenerMotivo.on("message", async (ctx: any) => {
  const {text: montoIngresado} = ctx.message;
  if (montoIngresado.length < 2 ) {
    await ctx.reply("Por favor, ingresá nuevamente un monto válido");
    return repetirPaso(ctx);
  }
  ctx.scene.session.datosCobro.monto = montoIngresado;
  const guardarMonto = await procesarRegistroCobro(ctx);
  if (!guardarMonto) {
    return repetirPaso(ctx);
  }
  await ctx.reply("Ingresá el motivo del cobro");
  return avanzar(ctx);
});

obtenerMotivo.command("salir", async (ctx) => {
  await ctx.reply("Cancelaste el registro del cobro");
  return leaveScene(ctx);
});

/**
 * Valida el motivo ingresado y solicita la asignacion del cobro a una de las socias
 */
const asignarCobro = new Composer<ExtendedContext>();
asignarCobro.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

asignarCobro.on("message", async (ctx: any) => {
  let {text: motivoIngresado} = ctx.message;
  motivoIngresado = motivoIngresado.toLowerCase();
  if (motivoIngresado.length < 2) {
    await ctx.reply("Por favor, ingresa un motivo por el cobro que despues no sabes porque le cobramos esta plata");
    return repetirPaso(ctx);
  }
  ctx.scene.session.datosCobro.motivo = motivoIngresado;
  const guardarMotivo = await procesarRegistroCobro(ctx);
  if (!guardarMotivo) {
    await ctx.reply("Ocurrió un error. Por favor ingresá nuevamente el motivo del cobro");
    return repetirPaso(ctx);
  }
  await ctx.reply(
    "¿Quien cobro la plata?",
    Markup.inlineKeyboard([
      Markup.button.callback("Fer", "cobroFer"),
      Markup.button.callback("Flor", "cobroFlor"),
    ]));
  return avanzar(ctx);
});
asignarCobro.command("salir", async (ctx) => {
  await ctx.reply("Cancelaste el registro del cobro");
  return leaveScene(ctx);
});

/**
 * Valida la asignación del cobro y pregunta si se dividió el pago
 */
const obtenerDivision = new Composer<ExtendedContext>();
obtenerDivision.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

obtenerDivision.on("message", async (ctx: any) => {
  await ctx.reply("Por favor, selecciona una de las socias para dejar asentado quien cobro la plata");
  await ctx.reply(
    "¿Quien cobro la plata?",
    Markup.inlineKeyboard([
      Markup.button.callback("Fer", "cobroFer"),
      Markup.button.callback("Flor", "cobroFlor"),
    ])); (ctx);
  return ctx.wizard.selectStep(3);
});

obtenerDivision.action("cobroFer", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosCobro) {
    await procesarRegistroCobro(ctx, Socias.FER);
    await ctx.editMessageText(
      "¿Ya dividieron la plata entre ustedes?",
      Markup.inlineKeyboard([
        Markup.button.callback("No", "cobroSinDividir"),
        Markup.button.callback("Si", "cobroDividido"),
      ]));
    return avanzar(ctx);
  }
  await ctx.reply("Algo salió mal, volvé a seleccionar la socia");
  await ctx.reply(
    "¿Quien cobro la plata?",
    Markup.inlineKeyboard([
      Markup.button.callback("Fer", "cobroFer"),
      Markup.button.callback("Flor", "cobroFlor"),
    ]));
  return repetirPaso(ctx);
});

obtenerDivision.action("cobroFlor", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosCobro) {
    await procesarRegistroCobro(ctx, Socias.FLOR);
    await ctx.editMessageText(
      "¿Ya dividieron la plata entre ustedes?",
      Markup.inlineKeyboard([
        Markup.button.callback("No", "cobroSinDividir"),
        Markup.button.callback("Si", "cobroDividido"),
      ]));
    return avanzar(ctx);
  }
  await ctx.reply("Algo salió mal, volvé a seleccionar la socia");
  await ctx.reply(
    "¿Quien cobro la plata?",
    Markup.inlineKeyboard([
      Markup.button.callback("Fer", "cobroFer"),
      Markup.button.callback("Flor", "cobroFlor"),
    ]));
  return repetirPaso(ctx);
});

obtenerDivision.command("salir", async (ctx) => {
  await ctx.reply("Cancelaste el registro del cobro");
  return leaveScene(ctx);
});

/**
 * Valida la division del cobro y la asigna al cobro
 */
const registrarDivision = new Composer<ExtendedContext>();
registrarDivision.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

registrarDivision.on("message", async (ctx: any) => {
  await ctx.reply("Por favor selecciona una opcion. Asi sabemos si ya se dividieron la platica");
  await ctx.reply(
    "¿Ya dividieron la plata entre ustedes?",
    Markup.inlineKeyboard([
      Markup.button.callback("No", "cobroSinDividir"),
      Markup.button.callback("Si", "cobroDividido"),
    ]));
  return ctx.wizard.selectStep(4);
});

/**
 * Sólo si el cobro se dividió se guardará la propiedad en el cobro, no vale la pena hacerlo
 * si no se dividi
 */
registrarDivision.action("cobroDividido", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosCobro ) {
    await procesarRegistroCobro(ctx, true);
    ctx.scene.session.datosCobro.datosConfirmados = true;
    const {datosCobro} = ctx.scene.session;
    await ctx.reply(
      `Confirmá si los datos son correctos:
         - <b>Cliente</b>: ${datosCobro.cliente.nombre}
         - <b>Monto</b>: $${new Intl.NumberFormat("de-DE", {minimumFractionDigits: 2}).format(datosCobro.monto!)}
         - <b>Motivo</b>: ${datosCobro.motivo}
         - <b>Cobrado por</b>: ${datosCobro.asignadoA}
         - <b>¿Ya está dividido?</b>: Si

         ¿Los datos son correctos?`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{text: "No, reiniciar registro", callback_data: "recomenzarRegistro"}],
            [{text: "Si, registrar cobro", callback_data: "registrar"}],
          ],
        },
      }
    );
    return avanzar(ctx);
  }
  await ctx.reply("Algo salió mal, volvé a seleccionar una opción");
  await ctx.reply(
    "¿Ya dividieron la plata entre ustedes?",
    Markup.inlineKeyboard([
      Markup.button.callback("No", "cobroSinDividir"),
      Markup.button.callback("Si", "cobroDividido"),
    ]));
  return ctx.wizard.selectStep(4);
});

/**
 * Si el cobro no se dividió no se guarda nada, simplemente se avanza al siguiente paso
 */
registrarDivision.action("cobroSinDividir", async (ctx) => {
  if (ctx.scene.session.datosCobro) {
    ctx.scene.session.datosCobro.datosConfirmados = true;
    const {datosCobro} = ctx.scene.session;
    ctx.reply(
      `Confirmá si los datos son correctos:
         - <b>Cliente</b>: ${datosCobro.cliente.nombre}
         - <b>Monto</b>: $${new Intl.NumberFormat("de-DE", {minimumFractionDigits: 2}).format(datosCobro.monto!)}
         - <b>Motivo</b>: ${datosCobro.motivo}
         - <b>Cobrado por</b>: ${datosCobro.asignadoA}
         - <b>¿Ya está dividido?</b>: No

         ¿Los datos son correctos?`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{text: "No, reiniciar registro", callback_data: "recomenzarRegistro"}],
            [{text: "Si, registrar cobro", callback_data: "registrar"}],
          ],
        },
      }
    );
  }
  return avanzar(ctx);
});


/**
 * Valida el ingreso del telefono y solicita confirmación de datos.
 * Una vez que el usuario ingresó tanto el nombre como el teléfono, se le debe presentar la oportunidad
 * de confirmar si los datos ingresados son correctos, para guardar el nuevo cliente o recomenzar el
 * registro
 */
const confirmarDatos = new Composer<ExtendedContext>();
confirmarDatos.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

confirmarDatos.on("message", async (ctx: any) => {
  await ctx.reply("Por favor selecciona una opcion para continuar");
  if (ctx.scene.session.datosCobro) {
    const {datosCobro} = ctx.scene.session;
    await ctx.reply(
      `Confirmá si los datos son correctos:
         - <b>Cliente</b>: ${datosCobro.cliente.nombre}
         - <b>Monto</b>: $${new Intl.NumberFormat("de-DE", {minimumFractionDigits: 2}).format(datosCobro.monto!)}
         - <b>Motivo</b>: ${datosCobro.motivo}
         - <b>Cobrado por</b>: ${datosCobro.asignadoA}
         - <b>¿Ya está dividido?</b>: ${!!datosCobro.yaDividieronLaPlata}
         ¿Los datos son correctos?`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{text: "No, reiniciar registro", callback_data: "recomenzarRegistro"}],
            [{text: "Si, registrar cobro", callback_data: "registrar"}],
          ],
        },
      }
    );
  }
  return ctx.wizard.selectStep(5);
});

/**
 * Sólo si el cobro se dividió se guardará la propiedad en el cobro, no vale la pena hacerlo
 * si no se dividi
 */
confirmarDatos.action("registrar", async (ctx) => {
  if (ctx.scene.session.datosCobro) {
    ctx.scene.session.datosCobro.datosConfirmados = true;
  }
  const registroCobro = await procesarRegistroCobro(ctx);
  if (!registroCobro) {
    // ERROR RETORNAR AL PRINCIPIO
    await ctx.reply("Ocurrió un error. Por favor volvé a ingresar /menu para ver las opciones");
    return leaveScene(ctx);
  }
  delete ctx.session.cobro;
  solicitarIngresoMenu(ctx);
  return ctx.scene.leave();
});

confirmarDatos.action("recomenzarRegistro", async (ctx: ExtendedContext) => {
  await ctx.editMessageText("Vamos de nuevo entonces");
  ctx.scene.session.datosCobro = ctx.session.cobro;
  await ctx.reply("Por favor ingresá el monto del cobro:");
  return ctx.wizard.selectStep(1);
});


export const cobroWizard = new Scenes.WizardScene(
  "cobros-wizard",
  obtenerMonto,
  obtenerMotivo,
  asignarCobro,
  obtenerDivision,
  registrarDivision,
  confirmarDatos,
);

const leaveScene = async (ctx: any) => {
  await ctx.reply("Cancelaste el registro de un nuevo cobro. Se borraron todos los datos.");
  solicitarIngresoMenu(ctx);

  delete ctx.session.cobro;
  delete ctx.scene.session.datosCobro;

  return ctx.scene.leave();
};


