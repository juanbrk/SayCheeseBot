require('dotenv').config();
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const functions = require("firebase-functions");
const {Telegraf, Markup} = require("telegraf");
const RedisSession = require('telegraf-session-redis');
const {button} = Markup;

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const session = new RedisSession({
  store: {
    host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
    port: process.env.TELEGRAM_SESSION_PORT || 6379,
  },
});

bot.use(session);

const express = require('express');
const app = express();

// --------------------------- CONSTANTES -------------------------------

const strings = {
  comandos: {
    start: "start",
    custom: "custom",
    ejemploComando: "comando",
    nuevoCliente: "nuevo_cliente",
  },
  mensajes: {
    nuevoCliente: {
      agregarCliente: "Genial. Por favor, pasame el nombre del nuevo cliente",
      obtenerTelefono: "Recibido. Pasame ahora el telefono del cliente por favor.",
      confirmarDatos: "Gracias por el telefono. ¿Podés confirmar si los siguientes datos son correctos, por favor?",
      registrandoCliente: "Gracias por confirmar. Procedo entonces a registrar el nuevo cliente",
      clienteCreado: "Se creó correctamente el cliente",
      consultaRecomienzoRegistro: "¿Querés volver a ingresar los datos?",
      confirmacion: {
        datosCorrectos: "Si, son correctos",
        datosIncorrectos: "No, son incorrectos",
        recomenzarRegistro: "Si, volver a ingresar datos",
        anularRegistro: "No, anular registro",
      },
    },
    confirmacion: {
      afirmativo: "Si",
      negativo: "No",
    },
  },
  constanciaDeRecibo: "Mensaje recibido",
  elDelComienzo: "Hola Chicas! Soy su nuevo asistente bot y es un placer trabajar para ustedes",
  surgioUnError: "Oops, encontre un error para",
  acercaDe: `Podés utilizar este bot para
     - Registrar cobros a clientes
     - Generar resumenes contables
     - Chatear con tu socia
     - Y lo que se te ocurra (solo tenes que avisarle a Juan)`,
  ejemploParaUsarComandos: "Podes comunicarte conmigo usando comandos. Para usar un comando apreta el simbolo [ / ] que" +
  " está a la derecha de donde escribis mensajes y selecciona el que dice comando.",
  preguntaPorTutorial: "¿Te gustaría hacer un pequeño tutorial para aprender a interactuar conmigo?",
  siConPulgarParaArriba: "Si 👍🏽",
  ahoraNoConCaritaSonriente: "Ahora no 😃",
  exitoAlUsarPrimerComando: "Genial, acabás de utilizar tu primer comando. Vamos ahora con las solicitudes en linea",
  inline: {
    conectarConFirestore: "Conectar con firestore",
    ejemploParaUsarInline: "Por favor dame una instrucción seleccionando una de las siguientes opciones:",
    ejemploInlineGracioso: "Mostrame algo gracioso",
    ejemploInlineInteresante: "Contame algo interesante",
  },
};

const teclados = {
  personalizado: "CUSTOM",
  inline: "INLINE",
};

// const sayCheeseGroupID = process.env.SAY_CHEESE_GROUP_CHAT_ID;
// const sayCheeseYJuanID = process.env.SAY_CHEESE_JUAN_CHAT_ID;

const urlsCosasGraciosas = [
  "https://media.giphy.com/media/26tP3M3i03hoIYL6M/giphy.gif",
];

const datosInteresantes = [
  "Cuando se encontró el primer hueso de dinosaurio hace miles de años en China, se creyó que era de un dragón, ya " +
  "que en ese país hay una cultura milenaria relacionado a ellos",
];
// -------------------------------- FUNCIONES ---------------------------------

// promises.push(ctx.telegram.sendDocument("chat_id", "http://gph.is/2roKEH4")); Para enviar un gif

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
  if (pressedStart) await ctx.reply(strings.elDelComienzo);
  await ctx.reply(strings.acercaDe);
  return enviarMensajeConMarkup(
    teclados.personalizado,
    [strings.siConPulgarParaArriba, strings.ahoraNoConCaritaSonriente],
    ctx,
    {mensaje: strings.preguntaPorTutorial},
  );
}

/**
 * Necesitamos educar al usuario acerca de como usar inline queries
 * @param {any} ctx telegraf context
 */
async function mostrarUsoDeInline(ctx) {
  await ctx.reply(strings.exitoAlUsarPrimerComando);
  return enviarMensajeConMarkup(
    teclados.inline,
    [
      {mensaje: strings.inline.ejemploInlineGracioso, url: "inlineGracioso"},
      {mensaje: strings.inline.ejemploInlineInteresante, url: "inlineInteresante"},
    ],
    ctx,
    {mensaje: strings.inline.ejemploParaUsarInline}
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

/**
 * Para poder registrar cobros, primero necesitamos registrar clientes
 * @param {Object} ctx Telegraf context object
 * @param {Boolean} esRecomienzoDelRegistro para saber de donde tomar el message inicial
 * @return {Object} Mensaje
 */
async function registrarNuevoCliente(ctx, esRecomienzoDelRegistro = false) {
  ctx.session.registrandoNuevoCliente = true;
  ctx.session.nuevoCliente = esRecomienzoDelRegistro ?
    {mensajeInicial: ctx.update.callback_query.message.message_id} :
    {mensajeInicial: ctx.message.message_id};
  return ctx.reply(strings.mensajes.nuevoCliente.agregarCliente);
}


// -------------------------------- COMANDOS ---------------------------------
// initialize the commands
bot.command(strings.comandos.start, (ctx) => darLaBienvenida(ctx, true));
bot.command(strings.comandos.ejemploComando, (ctx) => mostrarUsoDeInline(ctx));
bot.command(strings.comandos.nuevoCliente, (ctx) => registrarNuevoCliente(ctx));

// --------------------------- ACTIONS -------------------------------

bot.action("inlineGracioso", async (ctx) => {
  await ctx.editMessageText("Aquí te va algo gracioso");
  const urlGraciosa = urlsCosasGraciosas[Math.floor(Math.random() * urlsCosasGraciosas.length)];
  await ctx.telegram.sendDocument(ctx.chat.id, urlGraciosa);
  return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
});

bot.action("inlineInteresante", async (ctx) => {
  await ctx.editMessageText("¿Sabías que..");
  const datoInteresante = datosInteresantes[Math.floor(Math.random() * datosInteresantes.length)];
  ctx.reply(`${datoInteresante}?`);
  return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
});

bot.action("registrarNuevoCliente", async (ctx) => {
  await ctx.editMessageText(strings.mensajes.nuevoCliente.registrandoCliente);
  const coleccion = "Cliente";
  const docRef = db.collection(coleccion).doc(`${ctx.session.nuevoCliente.nombre}`);
  const documentoCliente = {
    nombre: `${ctx.session.nuevoCliente.nombre}`,
    telefono: `${ctx.session.nuevoCliente.telefono}`,
    registradoPor: `${ctx.update.callback_query.from.first_name}`,
  };

  await docRef.set(documentoCliente);
  ctx.reply(`${strings.mensajes.nuevoCliente.clienteCreado} ${ctx.session.nuevoCliente.nombre}`);
  ctx.session.registrandoNuevoCliente = false;
  ctx.session.nuevoCliente = {};

  return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
});

bot.action("confirmarRecomienzoDeRegistro", async (ctx) => {
  enviarMensajeConMarkup(
    teclados.inline,
    [
      {mensaje: strings.mensajes.nuevoCliente.confirmacion.recomenzarRegistro, url: "recomenzarRegistroNuevoCliente"},
      {mensaje: strings.mensajes.nuevoCliente.confirmacion.anularRegistro, url: "anularRegistroNuevoCliente"},
    ],
    ctx,
    {mensaje: strings.mensajes.nuevoCliente.consultaRecomienzoRegistro}
  );
  return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
});

bot.action("recomenzarRegistroNuevoCliente", async (ctx) => {
  registrarNuevoCliente(ctx, true);
  return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
});

bot.action("anularRegistroNuevoCliente", async (ctx) => {
  await enviarMensajeConMarkup(
    teclados.inline,
    [
      {mensaje: strings.mensajes.nuevoCliente.confirmacion.recomenzarRegistro, url: "recomenzarRegistroNuevoCliente"},
      {mensaje: strings.mensajes.nuevoCliente.confirmacion.anularRegistro, url: "anularRegistroNuevoCliente"},
    ],
    ctx,
    {mensaje: strings.mensajes.nuevoCliente.consultaRecomienzoRegistro}
  );
  return ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
});


// --------------------------- MIDDLEWARE -------------------------------


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
    if (ctx.session.registrandoNuevoCliente) {
      if (ctx.message.message_id == ctx.session.nuevoCliente.mensajeInicial + 2) { // input nombre cliente
        ctx.session.nuevoCliente.nombre = ctx.message.text;
        return ctx.reply(strings.mensajes.nuevoCliente.obtenerTelefono);
      } else if (ctx.message.message_id == ctx.session.nuevoCliente.mensajeInicial + 4) { // Telefono obtenido
        ctx.session.nuevoCliente.telefono = ctx.message.text;
        await ctx.reply(strings.mensajes.nuevoCliente.confirmarDatos);
        const datosDelCliente =
        "\n- Nombre: " + ctx.session.nuevoCliente.nombre + "\n- Telefono: " + ctx.session.nuevoCliente.telefono;

        return enviarMensajeConMarkup(
          teclados.inline,
          [
            {mensaje: strings.mensajes.nuevoCliente.confirmacion.datosCorrectos, url: "registrarNuevoCliente"},
            {mensaje: strings.mensajes.nuevoCliente.confirmacion.datosIncorrectos, url: "confirmarRecomienzoDeRegistro"},
          ],
          ctx,
          {mensaje: datosDelCliente}
        );
      }
    }
    // El mensaje no es de un update, sino un simple mensaje
    if (message.text === strings.siConPulgarParaArriba) {
      await ctx.reply(strings.ejemploParaUsarComandos, Markup.removeKeyboard());
    } else {
      promises.push(ctx.reply(strings.constanciaDeRecibo));
    }
  }
  return Promise.all(promises);
});

bot.on("inline_query", (ctx) => console.log("INQUIRED"));

bot.on('callback_query', (ctx) => {
  // Explicit usage
  ctx.telegram.answerCbQuery(ctx.callbackQuery.id);

  // Using context shortcut
  ctx.answerCbQuery();
});


// --------------------------- ERROR HANDLING -------------------------------
// error handling
bot.catch((err, ctx) => {
  functions.logger.error("[Bot] Error", err);
  functions.logger.error("[Bot] Error CTX", ctx);
  return ctx.reply(`${strings.surgioUnError} ${ctx.updateType}`, err);
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// --------------------------- CLOUD FUNCTIONS -------------------------------

// Expose Express API as a single Cloud Function:
exports.app = functions.https.onRequest(app);
