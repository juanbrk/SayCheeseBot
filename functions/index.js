// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

const functions = require("firebase-functions");
const {Telegraf, Markup} = require("telegraf");
const {button} = Markup;
const bot = new Telegraf("YOUR KEY HERE");

// Para comenzar a utilizarlo, escribí */nuevoCobro* en tu teclado`;

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
      {mensaje: mensajesComunes.ejemploInlineGracioso, url: "http://gph.is/2n1VsfF"},
      {mensaje: mensajesComunes.ejemploInlineInteresante, url: "https://www.rd.com/list/fun-snow-facts/"},
    ],
    ctx,
    {mensaje: mensajesComunes.ejemploParaUsarInline}
  );
}

// initialize the commands
bot.command(comandos.start, (ctx) => darLaBienvenida(ctx, true));
bot.command(comandos.ejemploComando, (ctx) => mostrarUsoDeInline(ctx));

bot.command(comandos.custom, (ctx) => {
  console.log(`INLINE KEYBOARD ${JSON.stringify(button.url("", "https://github.com/telegraf/telegraf/blob/develop/docs/examples/keyboard-bot.js"))}`);
  ctx.reply(
    "JPÑAS",
    Markup.inlineKeyboard([
      [button.url("inoasod", "https://github.com/telegraf/telegraf/blob/develop/docs/examples/keyboard-bot.js")],
    ]),
    );
});

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
    const botones = mensajesParaLosBotones.map( (boton) => [button.url(boton.mensaje, boton.url )]);
    return ctx.reply(
    extra.mensaje,
    Markup.inlineKeyboard(botones).oneTime(),
    );
}

// copy every message and send to the user
bot.on("message", async (ctx) => {
  const {message} = ctx;
  const promises = [];
  console.log(`MENSAJE ${JSON.stringify(message)}`);
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
