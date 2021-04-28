import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {ClienteAsEntity, ClientesEntities} from "../../../modules/models/cliente";
import {getClientesAsEntities} from "../../../services/cliente-service";
import {iniciarCobroCliente} from "../../actions/cobro-actions";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿Con qué puedo ayudarte?");
const subMenuRegistrarCobro = new MenuTemplate<ExtendedContext>("¿A quien le cobraste?");

menu.submenu("Registrar nuevo cobro", "registrarNuevoCobro", subMenuRegistrarCobro);
menu.manualRow(botonesVueltaAtras);

/**
 *
 * @param {ExtendedContext} ctx asd
 * @return {Promise<Record<string, string>>} asd
 */
async function getClientChoices(ctx: ExtendedContext): Promise<Record<string, string>> {
  const clientes: ClientesEntities = await getClientesAsEntities();
  const result: Record<string, string> = {};
  clientes.forEach((cliente: ClienteAsEntity) => {
    result[`${cliente.uid}`] = cliente.nombre;
  });
  return result;
}

/**
 * Necesitamos un submenú en el que mostrar todos los clientes y permitir la selección de
 * uno para registrar su cobro
 */
subMenuRegistrarCobro.choose("client", getClientChoices, {
  do: async (ctx, clienteUID) => {
    await ctx.answerCbQuery("Cobrar a cliente");
    await iniciarCobroCliente(ctx, clienteUID);
    return false;
  },
  columns: 2,
});

subMenuRegistrarCobro.manualRow(botonesVueltaAtras);
