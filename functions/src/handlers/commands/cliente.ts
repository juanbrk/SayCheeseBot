import {ExtendedContext} from "../../../config/context/myContext";
import {MenuTemplate, MenuMiddleware} from "telegraf-inline-menu";
import {bot} from "../../index";

/**
 *
 * @param {ExtendedContext} ctx
 * @return {Promise}
 */
export async function iniciarRegistroNuevoCliente(ctx: ExtendedContext) {
  const menu = new MenuTemplate<ExtendedContext>(() => "¿Querés registrar un nuevo cliente?");
  menu.interact("Si, registrar nuevo cliente", "registrarNuevoCliente", {
    do: async (ctx) => await ctx.answerCbQuery("Desea registrar cliente nuevo"),
  });

  menu.interact("Cancelar", "cancelarRegistroNuevoCliente", {
    do: async (ctx) => {
      await ctx.answerCbQuery("Cancelar registro cliente");
      return false;
    },
  });

  const menuMiddleware = new MenuMiddleware<ExtendedContext>("/", menu);
  bot.use(menuMiddleware.middleware());
  return menuMiddleware.replyToContext(ctx);
}
