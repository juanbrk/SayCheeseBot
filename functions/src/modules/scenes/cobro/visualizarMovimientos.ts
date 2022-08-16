import {Composer, Markup, Scenes} from "telegraf";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerAnosEnLosQueHuboCobros, obtenerMesesEnLosQueHuboCobros} from "../../../handlers/menus/choices";
import {obtenerCobrosParaMesYSocia} from "../../../services/cobro-service";
import {armarTextoCobroMes} from "../../../handlers/actions/cobro-actions";
import {Socias} from "../../enums/socias";
import {VisualizacionCobroSession} from "../../models/cobro";
import {avanzar, solicitarIngresoMenu} from "../general";
import {generarBotonesCallback} from "../../utils/menu";
import {imprimirEnConsola} from "../../utils/general";
import {TipoImpresionEnConsola} from "../../enums/tipoImpresionEnConsola";

const seleccionarTipoVisualizacion = async (ctx: ExtendedContext) => {
  imprimirEnConsola("Visualización cobro -> solicitar tipo visualizacion", TipoImpresionEnConsola.DEBUG);
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
 * Valida la visualizacion deseada (mes/socia) y solicita ingresar el año para ver los cobros
 */
const validarSeleccionYMostrarOpciones = new Composer<ExtendedContext>();
validarSeleccionYMostrarOpciones.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
validarSeleccionYMostrarOpciones.on("message", async (ctx: any) => volverAlInicio(ctx));

/**
 * Guardar mes seleccionado y saltar a la elección del año
 */
validarSeleccionYMostrarOpciones.action("mensual", async (ctx) => {
  imprimirEnConsola("Visualizacion cobros -> mensual", TipoImpresionEnConsola.DEBUG);
  const anos: Record<string, string> = await obtenerAnosEnLosQueHuboCobros(ctx);
  const botones: Array<any> = generarBotonesCallback(anos);

  await ctx.editMessageText(
    "Selecciona el año para ver los cobros",
    Markup.inlineKeyboard(botones, {columns: 2})
  );
  return ctx.wizard.selectStep(3);
});

/**
 * Mostrar socias para elegir.
 */
validarSeleccionYMostrarOpciones.action("socia", async (ctx) => {
  imprimirEnConsola("Visualizacion cobro -> socia", TipoImpresionEnConsola.DEBUG);
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
const validarEleccionSociaYSeleccionarAno = new Composer<ExtendedContext>();
validarEleccionSociaYSeleccionarAno.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

validarEleccionSociaYSeleccionarAno.on("message", async (ctx: any) => volverAlInicio(ctx));

validarEleccionSociaYSeleccionarAno.on("callback_query", async (ctx: any) => {
  if (ctx.callbackQuery) {
    const sociaElegida: Socias = ctx.update.callback_query.data;
    imprimirEnConsola("Visualizacion cobros -> socia elegida", TipoImpresionEnConsola.DEBUG, {sociaElegida});
    const visualizacionCobro: VisualizacionCobroSession = {
      socia: sociaElegida,
    };
    ctx.session.visualizacionCobro = visualizacionCobro;
    const anos: Record<string, string> = await obtenerAnosEnLosQueHuboCobros(ctx);
    const botones: Array<any> = generarBotonesCallback(anos);

    await ctx.editMessageText(
      `¿Para que año querés ver los cobros de ${sociaElegida}?`,
      Markup.inlineKeyboard(botones, {columns: 2})
    );
    return avanzar(ctx);
  }
});


/**
 * Mostrar los meses en los que hubo cobros en el año seleccionado
 */
const validarAnoYSeleccionarMeses = new Composer<ExtendedContext>();
validarAnoYSeleccionarMeses.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
validarAnoYSeleccionarMeses.on("callback_query", async (ctx: any) => {
  if (ctx.callbackQuery) {
    const anoSeleccionado = ctx.update.callback_query.data;
    const visualizacionCobro: VisualizacionCobroSession = ctx.session.visualizacionCobro ?
      {
        ...ctx.session.visualizacionCobro,
        anoSeleccionado: anoSeleccionado,
      } :
      {
        anoSeleccionado,
      };

    imprimirEnConsola("Visualizacion cobros -> seleccionar mes", TipoImpresionEnConsola.INFO, {visualizacionCtx: visualizacionCobro});
    ctx.session.visualizacionCobro = visualizacionCobro;

    const mesesEnLosQueHuboCobros: Record<string, string> = await obtenerMesesEnLosQueHuboCobros(ctx, anoSeleccionado);
    const botones: Array<any> = generarBotonesCallback(mesesEnLosQueHuboCobros);
    const textoPreguntandoPorSocia: string = "socia" in visualizacionCobro ? ` de ${visualizacionCobro.socia}` : "";

    await ctx.editMessageText(
      `¿Para qué mes del ${anoSeleccionado} querés ver los cobros ${textoPreguntandoPorSocia}?`,
      Markup.inlineKeyboard(botones, {columns: 2}));
  }
  return avanzar(ctx);
});

validarAnoYSeleccionarMeses.on("message", async (ctx: any) => volverAlInicio(ctx));

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
      undefined;

    imprimirEnConsola("Visualizacion cobros -> mostrar cobros", TipoImpresionEnConsola.DEBUG, {visualizacionCtx: visualizacionCobro});
    const cobrosMesSeleccionado = ctx.session.visualizacionCobro ?
      await obtenerCobrosParaMesYSocia(`${+mesSeleccionado + 1}`, visualizacionCobro.anoSeleccionado!, visualizacionCobro.socia) :
      await obtenerCobrosParaMesYSocia(`${+mesSeleccionado + 1}`, visualizacionCobro.anoSeleccionado!);

    const cuerpoMensajeCobros: string = armarTextoCobroMes(cobrosMesSeleccionado, +mesSeleccionado + 1, visualizacionCobro.anoSeleccionado!);
    await ctx.editMessageText(cuerpoMensajeCobros, {parse_mode: "HTML"});
    delete ctx.session.visualizacionCobro;
    solicitarIngresoMenu(ctx);
    return ctx.scene.leave();
  }
});

mostrarCobros.on("message", async (ctx: any) => volverAlInicio(ctx));

export const wizardMovimientosCobro = new Scenes.WizardScene(
  "visualizar-movimientos-wizard",
  seleccionarTipoVisualizacion,
  validarSeleccionYMostrarOpciones,
  validarEleccionSociaYSeleccionarAno,
  validarAnoYSeleccionarMeses,
  mostrarCobros,
);

const leaveScene = async (ctx: any) => {
  await ctx.reply("Saliste de la visualización de los cobros");
  solicitarIngresoMenu(ctx);
  
  delete ctx.session.cobro;
  delete ctx.scene.session.visualizacionCobro
  
  return ctx.scene.leave();
};

/**
 * Cuando se recibe un update distinto al que debería recibirse, o sucede algún error, o debemos reiniciar el proceso
 * eliminamos la session y volvemos al primer paso del wizard.
 * @param {ExtendedContext} ctx context
 * @return {any}
 */
const volverAlInicio = async (ctx: ExtendedContext) => {
  await ctx.reply("Por favor, selecciona una de las opciones de abajo.  No entiendo si escribís.");
  if (ctx.session.visualizacionCobro && "socia" in ctx.session.visualizacionCobro) {
    delete ctx.session.visualizacionCobro;
  }
  ctx.reply(
    "¿Cómo querés ver los cobros? ",
    Markup.inlineKeyboard([
      Markup.button.callback("Por mes", "mensual"),
      Markup.button.callback("Por socia", "socia"),
    ]));
  return ctx.wizard.selectStep(1);
};


