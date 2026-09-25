import {Markup} from "telegraf";
import {MarkupParaReply} from "../models/markupParaReply";
import {TipoDeTeclado} from "../enums/tiposDeTeclado";
import {ExtendedContext} from "../../../config/context/myContext";
import {imprimirEnConsola} from "./general";
import {TipoImpresionEnConsola} from "../enums/tipoImpresionEnConsola";

const {button} = Markup;

/**
 * Para evitar tener que escribir el markup de respuesta con teclado personalizado, usamos esta funcion donde
 * recibimos todos los componentes necesarios y devolvemos la respuesta
 *
 * @param {string} replyMarkup
 * @param {ExtendedContext} ctx contexto de telegram
 *
 * @return {Promise} respuesta con teclado personalizado
 */
export function replyConMarkup(replyMarkup: MarkupParaReply, ctx: ExtendedContext ) {
  let botones: any[] = [];
  let teclado: any;
  switch (replyMarkup.tipoDeTeclado) {
  case TipoDeTeclado.Personalizado:
    botones = replyMarkup.botones.map( (boton) => [button.text(boton.mensaje)]);
    teclado = Markup.keyboard(botones).oneTime();
    break;
  case TipoDeTeclado.Inline:
    botones = replyMarkup.botones.map( (boton) => [button.callback(boton.mensaje, boton.url! )]);
    teclado = Markup.inlineKeyboard(botones);
    break;
  }
  return ctx.reply(
    replyMarkup.mensajeParaEnviarAlChat,
    teclado,
  );
}

/**
 * Contesta el callback query de un botón sin frenar el handler si Telegram lo rechaza.
 * El answer es cosmético (saca el relojito del botón); cuando el query ya venció
 * ("query is too old", típico en un reintento o un cold start lento) lo que sigue —
 * entrar a la scene, editar el mensaje — tiene que ejecutarse igual.
 *
 * @param {ExtendedContext} ctx contexto de telegram
 * @param {string} texto aviso que Telegram muestra al tocar el botón
 * @return {Promise<void>}
 */
export async function responderCallback(ctx: ExtendedContext, texto: string) {
  try {
    await ctx.answerCbQuery(texto);
  } catch (error) {
    imprimirEnConsola("[answerCbQuery] Telegram rechazó el answer", TipoImpresionEnConsola.ERROR, error);
  }
}
