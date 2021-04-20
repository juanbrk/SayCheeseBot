import {Markup} from "telegraf";
import {mensajes as mensajesEnvio} from "../../modules/utils/mensajes";
import {procesarRegistroCliente} from "../actions/cliente";

const mensajes = {
  ejemploParaUsarComandos: "Podes comunicarte conmigo usando comandos. Para usar un comando apreta el simbolo [ / ] que" +
    " está a la derecha de donde escribis mensajes y selecciona el que dice comando.",
  constanciaDeRecibo: "Mensaje recibido",
};

/**
 *
 * @param {Any} ctx
 * @return {Promise}
 */
export async function messageHandler(ctx: any) {
  const {message} = ctx.update;
  const {session} = ctx;
  if (message.text === mensajesEnvio.siConPulgarParaArriba) {
    await ctx.reply(mensajes.ejemploParaUsarComandos, Markup.removeKeyboard());
  } else if (session.registrandoNuevoCliente) {
    procesarRegistroCliente(ctx);
  } else {
    ctx.reply(mensajes.constanciaDeRecibo);
  }
}
