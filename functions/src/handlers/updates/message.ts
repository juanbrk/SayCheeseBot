import {Markup} from 'telegraf';
import {mensajes as mensajesEnvio} from "../../modules/utils/mensajes";

const mensajes = {
    ejemploParaUsarComandos: "Podes comunicarte conmigo usando comandos. Para usar un comando apreta el simbolo [ / ] que" +
    " está a la derecha de donde escribis mensajes y selecciona el que dice comando.",
    constanciaDeRecibo: "Mensaje recibido",
};

export async function messageHandler(ctx: any){
    const {message} = ctx.update;
    if (message.text === mensajesEnvio.siConPulgarParaArriba) {
        await ctx.reply(mensajes.ejemploParaUsarComandos, Markup.removeKeyboard());
      } else {
        ctx.reply(mensajes.constanciaDeRecibo);
      }
}