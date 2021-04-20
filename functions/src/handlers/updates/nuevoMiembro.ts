import {ExtendedContext} from "../../../config/context/myContext";
import {darLaBienvenida} from "../../modules/utils/mensajes";

/**
 *
 * @param {ExtendedContext} ctx
 * @return {Promise}
 */
export async function saludarNuevoMiembro(ctx: ExtendedContext) {
  const {update}: any = ctx;
  const welcomeMessage = `Bienvenida ${update.message.new_chat_member.first_name} al grupo!`;
  await ctx.reply(welcomeMessage);
  return darLaBienvenida(ctx);
}
