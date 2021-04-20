import {Markup} from "telegraf";
import {MarkupParaReply} from "../models/markupParaReply";
import {TipoDeTeclado} from "../enums/tiposDeTeclado";
import {ExtendedContext} from "../../../config/context/myContext";

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
