require('dotenv').config();
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

const functions = require("firebase-functions");
const {Telegraf, Markup} = require("telegraf");
const {button} = Markup;
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const express = require('express');
const app = express();

// --------------------------- CONSTANTES -------------------------------

const mensajesComunes = {
  constanciaDeRecibo: "Mensaje recibido",
  elDelComienzo: "Hola Chicas! Soy su nuevo asistente bot y es un placer trabajar para ustedes",
  surgioUnError: "Oops, encontre un error para",
  acercaDe: `Podés utilizar este bot para
     - Registrar nuevos cobros a clientes
     - Generar resumenes contables
     - Chatear con tu socia
     - Y lo que se te ocurra (solo tenes que avisarle a Juan)`,
  ejemploParaUsarComandos: "Podes comunicarte conmigo usando comandos. Para usar un comando apreta el simbolo [ / ] que" +
  " está a la derecha de donde escribis mensajes y selecciona el que dice comando.",
  ejemploParaUsarInline: "Por favor dame una instrucción seleccionando una de las siguientes opciones:",
  ejemploInlineGracioso: "Mostrame algo gracioso",
  ejemploInlineInteresante: "Contame algo interesante",
  preguntaPorTutorial: "¿Te gustaría hacer un pequeño tutorial para aprender a interactuar conmigo?",
  siConPulgarParaArriba: "Si 👍🏽",
  ahoraNoConCaritaSonriente: "Ahora no 😃",
  exitoAlUsarPrimerComando: "Genial, acabás de utilizar tu primer comando. Vamos ahora con las solicitudes en linea",
};

const comandos = {
  start: "start",
  custom: "custom",
  ejemploComando: "comando",
};

const teclados = {
  personalizado: "CUSTOM",
  inline: "INLINE",
};

// -------------------------------- FUNCIONES ---------------------------------

// const sayCheeseGroupID = "-527027995";
// const sayCheeseYJuanID = "1183288911"
// promises.push(ctx.telegram.sendDocument("-527027995", "http://gph.is/2roKEH4")); Para enviar un gif

/**
 * Cuando se inicializa el bot, el bot se presenta, comenta que es lo que tiene para ofrecer y
 * otorga la posibilidad de hacer un tutorial
 *
 * @param {any} ctx Contexto de telegraf
 * @param {boolean} pressedStart esta funcion se llama tanto cuando se agrega un nuevo miembro al grupo como cuando
 * se presiona el comando /start, por lo que debe indicarse
 * @return {Promise}
 */
async function darLaBienvenida(ctx, pressedStart = false) {
  if (pressedStart) await ctx.reply(mensajesComunes.elDelComienzo);
  await ctx.reply(mensajesComunes.acercaDe);
  return enviarMensajeConMarkup(
    teclados.personalizado,
    [mensajesComunes.siConPulgarParaArriba, mensajesComunes.ahoraNoConCaritaSonriente],
    ctx,
    {mensaje: mensajesComunes.preguntaPorTutorial},
  );
}

/**
 * Necesitamos educar al usuario acerca de como usar inline queries
 * @param {any} ctx telegraf context
 */
async function mostrarUsoDeInline(ctx) {
  await ctx.reply(mensajesComunes.exitoAlUsarPrimerComando);
  return enviarMensajeConMarkup(
    teclados.inline,
    [
      {mensaje: mensajesComunes.ejemploInlineGracioso, url: "inlineGracioso"},
      {mensaje: mensajesComunes.ejemploInlineInteresante, url: "https://www.google.com"},
    ],
    ctx,
    {mensaje: mensajesComunes.ejemploParaUsarInline}
  );
}

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
function enviarMensajeConMarkup(tipoDeTeclado, mensajesParaLosBotones, ctx, extra = {} ) {
  if (tipoDeTeclado == teclados.personalizado) {
    const botones = mensajesParaLosBotones.map( (mensaje) => [button.text(mensaje)]);
    return ctx.reply(
      extra.mensaje,
      Markup.keyboard(botones).oneTime(),
      );
    }// Current support is for custom and inline keyboard
    const botones = mensajesParaLosBotones.map( (boton) => [button.callback(boton.mensaje, boton.url )]);
    return ctx.reply(
    extra.mensaje,
    Markup.inlineKeyboard(botones),
    );
}


// -------------------------------- COMANDOS ---------------------------------
// initialize the commands
bot.command(comandos.start, (ctx) => darLaBienvenida(ctx, true));
bot.command(comandos.ejemploComando, (ctx) => mostrarUsoDeInline(ctx));

// --------------------------- UPDATES -------------------------------

// copy every message and send to the user
bot.on("message", async (ctx) => {
  const {message} = ctx;
  const promises = [];
  if (message.new_chat_member) {
    const welcomeMessage = `Bienvenida ${message.new_chat_member.first_name} al grupo!`;
    await ctx.reply(welcomeMessage);
    return darLaBienvenida(ctx);
  } else {
    // El mensaje no es de un update, sino un simple mensaje
    if (message.text === mensajesComunes.siConPulgarParaArriba) {
      await ctx.reply(mensajesComunes.ejemploParaUsarComandos, Markup.removeKeyboard());
    } else {
      promises.push(ctx.reply(mensajesComunes.constanciaDeRecibo));
    }
  }
  return Promise.all(promises);
});

bot.on("inline_query", (ctx) => console.log("INQUIRED"));
bot.action("inlineGracioso", async (ctx) => {
  await ctx.editMessageText("Graciosado");
  await ctx.telegram.sendDocument("-527027995", "http://gph.is/2roKEH4");
  return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
}
);

bot.on('callback_query', (ctx) => {
  console.log('CALLBACK QUERY');

  // Explicit usage
  ctx.telegram.answerCbQuery(ctx.callbackQuery.id)

  // Using context shortcut
  ctx.answerCbQuery()
})
// --------------------------- ERROR HANDLING -------------------------------
// error handling
bot.catch((err, ctx) => {
  functions.logger.error("[Bot] Error", err);
  functions.logger.error("[Bot] Error CTX", ctx);
  return ctx.reply(`${mensajesComunes.surgioUnError} ${ctx.updateType}`, err);
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// --------------------------- CLOUD FUNCTIONS -------------------------------

exports.inlineGracioso = functions.https.onRequest(async (request, response) => {
  console.log(`REQUEST ${JSON.stringify(request)}`);
  console.log(`RESPONSE ${JSON.stringify(response)}`);
});

// Expose Express API as a single Cloud Function:
exports.app = functions.https.onRequest(app);
