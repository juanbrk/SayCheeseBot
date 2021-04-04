import { Context } from "telegraf";
import {darLaBienvenida} from '../../modules/utils/mensajes';


export async function saludarNuevoMiembro(ctx: Context){
    const {update}: any = ctx;
    const welcomeMessage = `Bienvenida ${update.message.new_chat_member.first_name} al grupo!`;
    await ctx.reply(welcomeMessage);
    return darLaBienvenida(ctx);
}