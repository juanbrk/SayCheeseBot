import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {iniciarCobroCliente} from "../../actions/cobro-actions";
import {obtenerListadoClientes} from "../choices";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿A quien le cobraste?");

/**
 * Necesitamos un submenú en el que mostrar todos los clientes y permitir la selección de
 * uno para registrar su cobro
 */
menu.choose("clienteId", obtenerListadoClientes, {
  do: async (ctx, clienteUID) => {
    await ctx.answerCbQuery("Cobrar a cliente");
    await iniciarCobroCliente(ctx, clienteUID);
    return false;
  },
  columns: 2,
});

menu.manualRow(botonesVueltaAtras);
