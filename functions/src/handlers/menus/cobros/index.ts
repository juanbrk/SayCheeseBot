import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {iniciarCobroCliente} from "../../actions/cobro-actions";
import {obtenerListadoClientes} from "../choices";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿Con qué puedo ayudarte?");
const subMenuRegistrarCobro = new MenuTemplate<ExtendedContext>("¿A quien le cobraste?");

menu.submenu("Registrar nuevo cobro", "nuevo", subMenuRegistrarCobro);
menu.manualRow(botonesVueltaAtras);

/**
 * Necesitamos un submenú en el que mostrar todos los clientes y permitir la selección de
 * uno para registrar su cobro
 */
subMenuRegistrarCobro.choose("clienteId", obtenerListadoClientes, {
  do: async (ctx, clienteUID) => {
    await ctx.answerCbQuery("Cobrar a cliente");
    await iniciarCobroCliente(ctx, clienteUID);
    return false;
  },
  columns: 2,
});

subMenuRegistrarCobro.manualRow(botonesVueltaAtras);
