import {Composer, Markup, Scenes} from "telegraf";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerAnosEnLosQueHuboMovimientos, obtenerMesesEnLosQueHuboMovimientos} from "../../../handlers/menus/choices";
import {Socias} from "../../enums/socias";
import {VisualizacionPagosSession} from "../../models/pago";

import {avanzar, solicitarIngresoMenu} from "../general";
import {generarBotonesCallback} from "../../utils/menu";
import {imprimirEnConsola} from "../../utils/general";
import {TipoImpresionEnConsola} from "../../enums/tipoImpresionEnConsola";
import {obtenerPagosParaMesYSocia} from "../../../services/pago-service";
import {armarTextoPagoMes} from "../../../handlers/actions/pagos-actions";

const seleccionarTipoVisualizacion = async (ctx: ExtendedContext) => {
  imprimirEnConsola("Visualización movimientos pagos -> solicitar tipo visualizacion", TipoImpresionEnConsola.DEBUG);
  if (ctx.scene.session.visualizacionMovimientosPagos) {
    ctx.scene.session.visualizacionMovimientosPagos = {...ctx.scene.session.visualizacionMovimientosPagos};
  }
  ctx.editMessageText(
    "¿Cómo querés ver los pagos? ",
    Markup.inlineKeyboard([
      Markup.button.callback("Por mes", "mensual"),
      Markup.button.callback("Por socia", "socia"),
    ]));
  return avanzar(ctx);
};

/**
 * Valida la visualizacion deseada (mes/socia) y solicita ingresar el año para ver los pagos
 */
const validarSeleccionYMostrarOpciones = new Composer<ExtendedContext>();
validarSeleccionYMostrarOpciones.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
validarSeleccionYMostrarOpciones.on("message", async (ctx: any) => volverAlInicio(ctx));

/**
 * Guardar mes seleccionado y saltar a la elección del año
 */
validarSeleccionYMostrarOpciones.action("mensual", async (ctx) => {
  imprimirEnConsola("Visualizacion movimientos pagos -> mensual", TipoImpresionEnConsola.DEBUG);
  const anos: Record<string, string> = await obtenerAnosEnLosQueHuboMovimientos(ctx);
  const botones: Array<any> = generarBotonesCallback(anos);

  await ctx.editMessageText(
    "Selecciona el año para ver los pagos",
    Markup.inlineKeyboard(botones, {columns: 2})
  );
  return ctx.wizard.selectStep(3);
});

/**
 * Mostrar socias para elegir.
 */
validarSeleccionYMostrarOpciones.action("socia", async (ctx) => {
  imprimirEnConsola("Visualizacion movimientos pagos -> socia", TipoImpresionEnConsola.DEBUG);
  await ctx.editMessageText("Elegí la socia para ver los pagos realizados",
    Markup.inlineKeyboard([
      Markup.button.callback("Fer", Socias.FER),
      Markup.button.callback("Flor", Socias.FLOR),
    ]));
  return avanzar(ctx);
});

/**
 * Valida la asignación del pago y pregunta si se dividió el pago
 */
const validarEleccionSociaYSeleccionarAno = new Composer<ExtendedContext>();
validarEleccionSociaYSeleccionarAno.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

validarEleccionSociaYSeleccionarAno.on("message", async (ctx: any) => volverAlInicio(ctx));

validarEleccionSociaYSeleccionarAno.on("callback_query", async (ctx: any) => {
  if (ctx.callbackQuery) {
    const sociaElegida: Socias = ctx.update.callback_query.data;
    imprimirEnConsola("Visualizacion movimientos pagos -> socia elegida", TipoImpresionEnConsola.DEBUG, {sociaElegida});
    const visualizacionMovimientosPagos: VisualizacionPagosSession = {
      socia: sociaElegida,
    };
    ctx.session.visualizacionMovimientosPagos = visualizacionMovimientosPagos;
    const anos: Record<string, string> = await obtenerAnosEnLosQueHuboMovimientos(ctx);
    const botones: Array<any> = generarBotonesCallback(anos);

    await ctx.editMessageText(
      `¿Para que año querés ver los pagos de ${sociaElegida}?`,
      Markup.inlineKeyboard(botones, {columns: 2})
    );
    return avanzar(ctx);
  }
});


/**
 * Mostrar los meses en los que hubo pagos en el año seleccionado
 */
const validarAnoYSeleccionarMeses = new Composer<ExtendedContext>();
validarAnoYSeleccionarMeses.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
validarAnoYSeleccionarMeses.on("callback_query", async (ctx: any) => {
  if (ctx.callbackQuery) {
    const anoSeleccionado = ctx.update.callback_query.data;
    const visualizacionMovimientosPagos: VisualizacionPagosSession = ctx.session.visualizacionMovimientosPagos ?
      {
        ...ctx.session.visualizacionMovimientosPagos,
        anoSeleccionado: anoSeleccionado,
      } :
      {
        anoSeleccionado,
      };

    imprimirEnConsola("Visualizacion movimientos pagos -> seleccionar mes", TipoImpresionEnConsola.INFO, {visualizacionCtx: visualizacionMovimientosPagos});
    ctx.session.visualizacionMovimientosPagos = visualizacionMovimientosPagos;

    const mesesEnLosQueHuboPagos: Record<string, string> = await obtenerMesesEnLosQueHuboMovimientos(ctx, anoSeleccionado);
    const botones: Array<any> = generarBotonesCallback(mesesEnLosQueHuboPagos);
    const textoPreguntandoPorSocia: string = "socia" in visualizacionMovimientosPagos ? ` de ${visualizacionMovimientosPagos.socia}` : "";

    await ctx.editMessageText(
      `¿Para qué mes del ${anoSeleccionado} querés ver los pagos ${textoPreguntandoPorSocia}?`,
      Markup.inlineKeyboard(botones, {columns: 2}));
  }
  return avanzar(ctx);
});

validarAnoYSeleccionarMeses.on("message", async (ctx: any) => volverAlInicio(ctx));

/**
 * Muestra los pagos del mes seleccionado
 */
const mostrarPagos = new Composer<ExtendedContext>();
mostrarPagos.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
mostrarPagos.on("callback_query", async (ctx: any) => {
  if (ctx.callbackQuery) {
    const mesSeleccionado = ctx.update.callback_query.data;

    const visualizacionMovimientosPagos: VisualizacionPagosSession = ctx.session.visualizacionMovimientosPagos ?
      {
        ...ctx.session.visualizacionMovimientosPagos,
        mesSeleccionado: mesSeleccionado,
      } :
      undefined;

    imprimirEnConsola("Visualizacion movimientos pagos -> mostrar pagos mes seleccionado", TipoImpresionEnConsola.DEBUG, {visualizacionCtx: visualizacionMovimientosPagos});
    const pagosMesSeleccionado = ctx.session.visualizacionMovimientosPagos ?
      await obtenerPagosParaMesYSocia(`${+mesSeleccionado + 1}`, visualizacionMovimientosPagos.anoSeleccionado!, visualizacionMovimientosPagos.socia) :
      await obtenerPagosParaMesYSocia(`${+mesSeleccionado + 1}`, visualizacionMovimientosPagos.anoSeleccionado!);

    const cuerpoMensajePagos: string = armarTextoPagoMes(pagosMesSeleccionado, +mesSeleccionado + 1, visualizacionMovimientosPagos.anoSeleccionado!);
    await ctx.editMessageText(cuerpoMensajePagos, {parse_mode: "HTML"});
    delete ctx.session.visualizacionMovimientosPagos;
    solicitarIngresoMenu(ctx);
    return ctx.scene.leave();
  }
});

mostrarPagos.on("message", async (ctx: any) => volverAlInicio(ctx));

export const wizardMovimientosPagos = new Scenes.WizardScene(
  "visualizar-movimientos-pagos-wizard",
  seleccionarTipoVisualizacion,
  validarSeleccionYMostrarOpciones,
  validarEleccionSociaYSeleccionarAno,
  validarAnoYSeleccionarMeses,
  mostrarPagos,
);

const leaveScene = async (ctx: any) => {
  await ctx.reply("Saliste de la visualización de los pagos");
  solicitarIngresoMenu(ctx);

  //   delete ctx.session.pago; // ? no lo cree todavia
  delete ctx.scene.session.visualizacionMovimientosPagos;

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
  if (ctx.session.visualizacionMovimientosPagos && "socia" in ctx.session.visualizacionMovimientosPagos) {
    delete ctx.session.visualizacionMovimientosPagos;
  }
  ctx.reply(
    "¿Cómo querés ver los pagos? ",
    Markup.inlineKeyboard([
      Markup.button.callback("Por mes", "mensual"),
      Markup.button.callback("Por socia", "socia"),
    ]));
  return ctx.wizard.selectStep(1);
};


