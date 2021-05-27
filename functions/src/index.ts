import {Telegraf} from "telegraf";
import {Request, Response} from "express";
import {ExtendedContext} from "../config/context/myContext";
import functions = require("firebase-functions");
import {MenuMiddleware} from "telegraf-inline-menu/dist/source";
import {messageHandler} from "./handlers/updates/message";


import {onBalanceCreated} from "./controllers/balance-controller";

import {menu} from "./handlers/menus/index";
import admin = require("firebase-admin");
import firestoreSession = require("telegraf-session-firestore");

admin.initializeApp();
export const db = admin.firestore();
const telegramToken: string = functions.config().telegram.token;
if (telegramToken === undefined) {
  throw new Error("BOT TOKEN must be provided");
}
export const bot = new Telegraf<ExtendedContext>(telegramToken, {telegram: {webhookReply: true}});

// --------------------------- MIDDLEWARE -------------------------------
bot.use(firestoreSession(db.collection("sessions")));
bot.use(async (ctx, next) => {
  const session = ctx.session;
  console.log("SESSION", session);
  return next();
});


export const menuMiddleware = new MenuMiddleware("/", menu);
// --------------------------- COMMANDS -------------------------------
bot.start((ctx) => menuMiddleware.replyToContext(ctx));
bot.command("menu", (ctx) => menuMiddleware.replyToContext(ctx));

// --------------------------- COMMANDS -------------------------------
bot.on("message", async (ctx) => messageHandler(ctx));

// --------------------------- ERROR HANDLING -------------------------------
// error handling
bot.catch((err: any, ctx: any) => {
  functions.logger.error("[Bot] Error", err);
  functions.logger.error("[Bot] Error CTX", ctx);
  return ctx.reply("Error", err);
});

bot.telegram.setMyCommands([
  {command: "start", description: "Comenzar a usar el bot"},
  {command: "menu", description: "Consultá las opciones que tengo para ayudarte"},
  {command: "help", description: "Mostrar ayuda"},
  {command: "settings", description: "Abrir las configuraciones"},
]);


bot.use(menuMiddleware.middleware());
// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest((req: Request, res: Response) => bot.handleUpdate(req.body, res));

// Listeners

exports.onBalanceCreated = onBalanceCreated;


