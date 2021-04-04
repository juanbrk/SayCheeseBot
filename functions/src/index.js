require('dotenv').config();
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const functions = require("firebase-functions");
const {Telegraf, Markup} = require("telegraf");
const RedisSession = require('telegraf-session-redis');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN, {telegram: {webhookReply: true}});

const session = new RedisSession({
  store: {
    host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
    port: process.env.TELEGRAM_SESSION_PORT || 6379,
  },
});

bot.use(session);

const express = require('express');
const app = express();



// -------------------------------- FUNCIONES ---------------------------------

// promises.push(ctx.telegram.sendDocument("chat_id", "http://gph.is/2roKEH4")); Para enviar un gif

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
// -------------------------------- MIDDLEWARE ---------------------------------
// Ejemplo de middleware
app.use((req, res) => {
  console.log('Servidor web funcionando tanto en http y https !');
  res.send('Servidor web funcionando tanto en http y https !');
});

// -------------------------------- COMANDOS ---------------------------------
// initialize the commands
bot.command(strings.comandos.start, (ctx) => darLaBienvenida(ctx, true));
bot.command(strings.comandos.ejemploComando, (ctx) => mostrarUsoDeInline(ctx));
bot.command(strings.comandos.nuevoCliente, (ctx) => registrarNuevoCliente(ctx));



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
// --------------------------- UPDATES -------------------------------

// copy every message and send to the user
bot.on("message", async (ctx) => {
  const {message} = ctx;
  const promises = [];
  
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
  return Promise.all(promises);
});

bot.on("inline_query", (ctx) => console.log("INQUIRED"));

bot.on('callback_query', (ctx) => {
  // Explicit usage
  ctx.telegram.answerCbQuery(ctx.callbackQuery.id);

  // Using context shortcut
  ctx.answerCbQuery();
});

// --------------------------- CLOUD FUNCTIONS -------------------------------

// Expose Express API as a single Cloud Function:
exports.app = functions.https.onRequest(
  (req, res) => bot.handleUpdate(req.body, res)
);
