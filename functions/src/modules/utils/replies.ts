import {Context, Markup } from "telegraf";
import { MarkupParaReply } from "../models/markupParaReply";
import {TipoDeTeclado} from '../enums/tiposDeTeclado';

const {button} = Markup;

/**
 * Para evitar tener que escribir el markup de respuesta con teclado personalizado, usamos esta funcion donde
 * recibimos todos los componentes necesarios y devolvemos la respuesta
 *
 * @param {string} tipoDeTeclado que se desea mostrar
 * @param {array | any} mensajesParaLosBotones mensajes que iran en cada boton.
 *  - array if text button
 *  - object if url button
 * @param {any} ctx contexto de telegram
 * @param {string} extra params no obligatorios
 *  - mensaje: para enviar al usuario si usamos un teclado perosnalizado
 *
 * @return {Promise} respuesta con teclado personalizado
 */

export function replyConMarkup(replyMarkup: MarkupParaReply, ctx: Context ) {
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
