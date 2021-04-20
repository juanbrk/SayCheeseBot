import {MarkupParaReply} from "../models/markupParaReply";
import {TipoDeTeclado} from "../enums/tiposDeTeclado";
import {replyConMarkup} from "./replies";
import {ExtendedContext} from "../../../config/context/myContext";

export const mensajes = {
  acercaDe: `
    Podés utilizar este bot para:
    -Registrar cobros a clientes
    - Generar resumenes contables
    - Chatear con tu socia
    - Y lo que se te ocurra (solo tenes que avisarle a Juan)`,
  ahoraNoConCaritaSonriente: "Ahora no 😃",
  elDelComienzo: "Hola Chicas! Soy su nuevo asistente bot y es un placer trabajar para ustedes",
  exitoAlUsarPrimerComando: "Genial, acabás de utilizar tu primer comando. Vamos ahora con las solicitudes en linea",
  preguntaPorTutorial: "¿Te gustaría hacer un pequeño tutorial para aprender a interactuar conmigo?",
  siConPulgarParaArriba: "Si 👍🏽",
  inline: {
    conectarConFirestore: "Conectar con firestore",
    ejemploParaUsarInline: "Por favor dame una instrucción seleccionando una de las siguientes opciones:",
    ejemploInlineGracioso: "Mostrame algo gracioso",
    ejemploInlineInteresante: "Contame algo interesante",

  },
};

/**
 * Cuando se inicializa el bot, el bot se presenta, comenta que es lo que tiene para ofrecer y
 * otorga la posibilidad de hacer un tutorial
 *
 * @param {ExtendedContext} ctx Contexto de telegraf
 * @param {boolean} sePresionoStart esta funcion se llama tanto cuando se agrega un nuevo miembro al grupo como cuando
 * se presiona el comando /start, por lo que debe indicarse
 * @return {Promise}
 */
export async function darLaBienvenida(ctx: ExtendedContext, sePresionoStart = false) {
  if (sePresionoStart) await ctx.reply(mensajes.elDelComienzo);
  await ctx.reply(mensajes.acercaDe);
  const replyMarkup: MarkupParaReply = {
    tipoDeTeclado: TipoDeTeclado.Personalizado,
    botones: [
      {mensaje: mensajes.siConPulgarParaArriba},
      {mensaje: mensajes.ahoraNoConCaritaSonriente},
    ],
    mensajeParaEnviarAlChat: mensajes.preguntaPorTutorial,
  };

  return replyConMarkup(replyMarkup, ctx);
}

/**
 * Necesitamos educar al usuario acerca de como usar inline queries
 * @param {any} ctx telegraf context
 */
export async function mostrarUsoDeInline(ctx: ExtendedContext) {
  await ctx.reply(mensajes.exitoAlUsarPrimerComando);
  const replyMarkup: MarkupParaReply = {
    tipoDeTeclado: TipoDeTeclado.Inline,
    botones: [
      {mensaje: mensajes.inline.ejemploInlineGracioso, url: "inlineGracioso"},
      {mensaje: mensajes.inline.ejemploInlineInteresante, url: "inlineInteresante"},
    ],
    mensajeParaEnviarAlChat: mensajes.inline.ejemploParaUsarInline,
  };

  return replyConMarkup(replyMarkup, ctx);
}
