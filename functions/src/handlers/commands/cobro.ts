import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../config/context/myContext";
import {ClienteFirestore} from "../../modules/models/cliente";
import {getClientes} from "../../services/cobro-service";

/**
 *
 * @param {ExtendedContext} ctx
 * @return {Promise}
 */
export async function iniciarRegistroCobro(ctx: ExtendedContext) {
  const clientes: ClienteFirestore[]= await getClientes();
  const nombresClientes = clientes.map((cliente) => cliente.nombre);
  console.log(nombresClientes);

  // Mostrar clientes
  const menu = new MenuTemplate<ExtendedContext>(() => "¿A qué cliente le cobraste?");
  menu.choose("cobro", nombresClientes, {
    do: async (ctx, key) => {
      await ctx.answerCbQuery("Desea registrar cobro cliente");
      return false;
    },
  });
  return;
}
