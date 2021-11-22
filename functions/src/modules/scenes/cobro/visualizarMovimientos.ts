import {Composer, Markup, Scenes} from "telegraf";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerMesesEnLosQueHuboCobros} from "../../../handlers/menus/choices";
import {obtenerCobrosParaMesYSocia} from "../../../services/cobro-service";
import {armarTextoCobroMes} from "../../../handlers/actions/cobro-actions";
import {Socias} from "../../enums/socias";
import {VisualizacionCobroSession} from "../../models/cobro";
import {avanzar, solicitarIngresoMenu} from "../general";


const seleccionarTipoVisualizacion = async (ctx: ExtendedContext) => {
  if (ctx.scene.session.visualizacionCobro) {
    ctx.scene.session.visualizacionCobro = {...ctx.scene.session.visualizacionCobro};
  }
  ctx.editMessageText(
    "¿Cómo querés ver los cobros? ",
    Markup.inlineKeyboard([
      Markup.button.callback("Por mes", "mensual"),
      Markup.button.callback("Por socia", "socia"),
    ]));
  return avanzar(ctx);
};

/**
 * Valida el nombre ingresado y solicita el ingreso del telefono
 */
const validarSeleccionYMostrarOpciones = new Composer<ExtendedContext>();
validarSeleccionYMostrarOpciones.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
validarSeleccionYMostrarOpciones.on("message", async (ctx: any) => {
  await ctx.reply("Por favor, selecciona una de las opciones. No entiendo si escribís.");
  await ctx.reply(
    "¿Cómo querés ver los cobros?",
    Markup.inlineKeyboard([
      Markup.button.callback("Por mes", "mensual"),
      Markup.button.callback("Por socia", "socia"),
    ]));
  return ctx.wizard.selectStep(1);
});

validarSeleccionYMostrarOpciones.action("mensual", async (ctx) => {
  const meses: Record<string, string> = await obtenerMesesEnLosQueHuboCobros(ctx);
  const botones: Array<any> = [];
  for (const mes in meses) {
    if (meses.hasOwnProperty(mes)) {
      botones.push(Markup.button.callback(meses[mes], mes));
    }
  }

  await ctx.editMessageText(
    "Selecciona el mes para ver los cobros",
    Markup.inlineKeyboard(botones, {columns: 2})
  );
  return ctx.wizard.selectStep(3);
});

validarSeleccionYMostrarOpciones.action("socia", async (ctx) => {
  await ctx.editMessageText("Elegí la socia para ver los cobros realizados",
    Markup.inlineKeyboard([
      Markup.button.callback("Fer", Socias.FER),
      Markup.button.callback("Flor", Socias.FLOR),
    ]));
  return avanzar(ctx);
});

/**
 * Valida la asignación del cobro y pregunta si se dividió el pago
 */
const validarEleccionSociaYMostrarMeses = new Composer<ExtendedContext>();
validarEleccionSociaYMostrarMeses.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

validarEleccionSociaYMostrarMeses.on("message", async (ctx: any) => {
  await ctx.reply("Por favor, selecciona una de opciones de abajo");
  ctx.reply(
    "¿Cómo querés ver los cobros? ",
    Markup.inlineKeyboard([
      Markup.button.callback("Por mes", "mensual"),
      Markup.button.callback("Por socia", "socia"),
    ]));
  return ctx.wizard.selectStep(1);
});

validarEleccionSociaYMostrarMeses.action(Socias.FER, async (ctx) => {
  if (ctx.callbackQuery ) {
    const visualizacionCobro: VisualizacionCobroSession = {
      socia: Socias.FER,
    };
    ctx.session.visualizacionCobro = visualizacionCobro;
    const meses: Record<string, string> = await obtenerMesesEnLosQueHuboCobros(ctx);
    const botones: Array<any> = [];

    for (const mes in meses) {
      if (meses.hasOwnProperty(mes)) {
        botones.push(Markup.button.callback(meses[mes], mes));
      }
    }

    await ctx.editMessageText(
      "Selecciona el mes para ver los cobros de Fer",
      Markup.inlineKeyboard(botones, {columns: 2}));


    return avanzar(ctx);
  }
});

validarEleccionSociaYMostrarMeses.action(Socias.FLOR, async (ctx) => {
  if (ctx.callbackQuery ) {
    const visualizacionCobro: VisualizacionCobroSession = {
      socia: Socias.FLOR,
    };
    ctx.session.visualizacionCobro = visualizacionCobro;
    const meses: Record<string, string> = await obtenerMesesEnLosQueHuboCobros(ctx);
    const botones: Array<any> = [];

    for (const mes in meses) {
      if (meses.hasOwnProperty(mes)) {
        botones.push(Markup.button.callback(meses[mes], mes));
      }
    }

    await ctx.editMessageText(
      "Selecciona el mes para ver los cobros de Flor",
      Markup.inlineKeyboard(botones, {columns: 2}));

    return avanzar(ctx);
  }
});

/**
 * Muestra los cobros del mes seleccionado
 */
const mostrarCobros = new Composer<ExtendedContext>();
mostrarCobros.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
mostrarCobros.on("callback_query", async (ctx: any) => {
  if (ctx.callbackQuery) {
    const mesSeleccionado = ctx.update.callback_query.data;

    const visualizacionCobro: VisualizacionCobroSession = ctx.session.visualizacionCobro ?
      {
        ...ctx.session.visualizacionCobro,
        mesSeleccionado: mesSeleccionado,
      } :
      undefined
    ;

    const cobrosMesSeleccionado = ctx.session.visualizacionCobro ?
      await obtenerCobrosParaMesYSocia(`${+mesSeleccionado+1}`, visualizacionCobro.socia) :
      await obtenerCobrosParaMesYSocia(`${+mesSeleccionado+1}`);

    const cuerpoMensajeCobros: string = armarTextoCobroMes(cobrosMesSeleccionado, +mesSeleccionado+1);
    await ctx.editMessageText(cuerpoMensajeCobros, {parse_mode: "HTML"});
    delete ctx.session.visualizacionCobro;
    solicitarIngresoMenu(ctx);
    return ctx.scene.leave();
  }
});

mostrarCobros.on("message", async (ctx: any) => {
  await ctx.reply("Por favor, selecciona una de las opciones de abajo");
  if (ctx.session.visualizacionCobro && "socia" in ctx.session.visualizacionCobro) {
    delete ctx.session.visualizacionCobro.socia;
  }
  ctx.reply(
    "¿Cómo querés ver los cobros? ",
    Markup.inlineKeyboard([
      Markup.button.callback("Por mes", "mensual"),
      Markup.button.callback("Por socia", "socia"),
    ]));
  return ctx.wizard.selectStep(1);
});


export const wizardMovimientosCobro = new Scenes.WizardScene(
  "visualizar-movimientos-wizard",
  seleccionarTipoVisualizacion,
  validarSeleccionYMostrarOpciones,
  validarEleccionSociaYMostrarMeses,
  mostrarCobros,
);

const leaveScene = async (ctx: any) => {
  await ctx.reply("Saliste de la visualización de los cobros");
  solicitarIngresoMenu(ctx);
  delete ctx.session.cobro;
  return ctx.scene.leave();
};


