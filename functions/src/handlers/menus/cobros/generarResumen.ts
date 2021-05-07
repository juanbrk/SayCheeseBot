import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {presentarResumen} from "../../actions/resumen-actions";
import {obtenerListadoResumenes} from "../choices";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿Para qué mes querés generar el resúmen?");

/**
 * El usuario necesita visualizar todos los meses para los que hubo cobros, para así realizar
 * un resúmen de los mismos.
 */
menu.choose("mes", obtenerListadoResumenes, {
  do: async (ctx, resumenUID) => {
    await ctx.answerCbQuery("Generar Resumen");
    await presentarResumen(ctx, resumenUID);
    delete ctx.session.resumenes;
    return false;
  },
  columns: 2,
});

menu.manualRow(botonesVueltaAtras);
