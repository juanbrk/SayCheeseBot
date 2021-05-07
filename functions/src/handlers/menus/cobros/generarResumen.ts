import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {iniciarCobroCliente} from "../../actions/cobro-actions";
import {obtenerListadoClientes} from "../choices";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿Para qué mes querés generar el resúmen?");

/**
 * El usuario necesita visualizar todos los meses para los que hubo cobros, para así realizar
 * un resúmen de los mismos.
 */
menu.choose("mes", obtenerListadoClientes, {
  do: async (ctx, clienteUID) => {
    await ctx.answerCbQuery("Generar Resumen");
    await iniciarCobroCliente(ctx, clienteUID);
    return false;
  },
  columns: 2,
});

menu.manualRow(botonesVueltaAtras);
