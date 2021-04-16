import {Telegraf} from 'telegraf';
import { Request, Response } from 'express';

import {startCommand} from "./handlers/commands/start";
import {ejemploCommand} from "./handlers/commands/comando";
import {saludarNuevoMiembro} from "./handlers/updates/nuevoMiembro";
import { messageHandler } from './handlers/updates/message';
import { responderAInlineGracioso } from './handlers/actions/responderAInlineGracioso';
import { responderAInlineInteresante } from './handlers/actions/responderAInlineInteresante';

const admin = require("firebase-admin");
admin.initializeApp();

const functions = require("firebase-functions");
// const db = admin.firestore();

const telegramToken: string = functions.config().telegram.token;
if (telegramToken === undefined) {
    throw new Error('BOT TOKEN must be provided');
}
const bot = new Telegraf(telegramToken, {telegram: {webhookReply: true}});

// --------------------------- MIDDLEWARE -------------------------------

// --------------------------- COMMANDS -------------------------------
bot.start((ctx) => startCommand(ctx, true));
bot.command("comando", (ctx) => ejemploCommand(ctx));
  
// --------------------------- HANDLING UPDATES -------------------------------

bot.on('new_chat_members', async (ctx) => saludarNuevoMiembro(ctx));
bot.on('message', async (ctx) => messageHandler(ctx));

// --------------------------- ACTIONS -------------------------------

bot.action("inlineGracioso", async (ctx) => responderAInlineGracioso(ctx));
bot.action("inlineInteresante", async (ctx) => responderAInlineInteresante(ctx));

// -------------------------------- COMANDOS ---------------------------------
// initialize the commands

// bot.command(strings.comandos.ejemploComando, (ctx) => mostrarUsoDeInline(ctx));
// bot.command(strings.comandos.nuevoCliente, (ctx) => registrarNuevoCliente(ctx));

// copy every message and send to the user
// bot.on("message", async (ctx) => {
//     const {message} = ctx;
//     const promises = [];
//     if (ctx.session.registrandoNuevoCliente) {
//         if (ctx.message.message_id == ctx.session.nuevoCliente.mensajeInicial + 2) { // input nombre cliente
//           ctx.session.nuevoCliente.nombre = ctx.message.text;
//           return ctx.reply(strings.mensajes.nuevoCliente.obtenerTelefono);
//         } else if (ctx.message.message_id == ctx.session.nuevoCliente.mensajeInicial + 4) { // Telefono obtenido
//           ctx.session.nuevoCliente.telefono = ctx.message.text;
//           await ctx.reply(strings.mensajes.nuevoCliente.confirmarDatos);
//           const datosDelCliente =
//           "\n- Nombre: " + ctx.session.nuevoCliente.nombre + "\n- Telefono: " + ctx.session.nuevoCliente.telefono;
  
//           return enviarMensajeConMarkup(
//             teclados.inline,
//             [
//               {mensaje: strings.mensajes.nuevoCliente.confirmacion.datosCorrectos, url: "registrarNuevoCliente"},
//               {mensaje: strings.mensajes.nuevoCliente.confirmacion.datosIncorrectos, url: "confirmarRecomienzoDeRegistro"},
//             ],
//             ctx,
//             {mensaje: datosDelCliente}
//           );
//         }
//       }
//       // El mensaje no es de un update, sino un simple mensaje
//       if (message.text === strings.siConPulgarParaArriba) {
//         await ctx.reply(strings.ejemploParaUsarComandos, Markup.removeKeyboard());
//       } else {
//         promises.push(ctx.reply(strings.constanciaDeRecibo));
//       }
//     }
//     return Promise.all(promises);
//   });
  

// --------------------------- ERROR HANDLING -------------------------------
// error handling
bot.catch((err: any, ctx:any) => {
    functions.logger.error("[Bot] Error", err);
    functions.logger.error("[Bot] Error CTX", ctx);
    return ctx.reply(`Error`, err);
});

// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest((req: Request, res: Response) => bot.handleUpdate(req.body, res));


