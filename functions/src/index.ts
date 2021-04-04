import * as dotenv from 'dotenv';
import {Telegraf} from 'telegraf';
import { Request, Response } from 'express';

import {startCommand} from "./handlers/commands/start";
import {ejemploCommand} from "./handlers/commands/comando";
import {saludarNuevoMiembro} from "./handlers/updates/nuevoMiembro";
import { messageHandler } from './handlers/updates/message';
import { responderAInlineGracioso } from './handlers/actions/responderAInlineGracioso';
import { responderAInlineInteresante } from './handlers/actions/responderAInlineInteresante';

dotenv.config();
const admin = require("firebase-admin");
admin.initializeApp();

const functions = require("firebase-functions");
// const db = admin.firestore();

const telegramToken: string = process.env.TELEGRAM_TOKEN!;
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

// --------------------------- ERROR HANDLING -------------------------------
// error handling
bot.catch((err: any, ctx:any) => {
    functions.logger.error("[Bot] Error", err);
    functions.logger.error("[Bot] Error CTX", ctx);
    return ctx.reply(`Error`, err);
});

// Expose Express API as a single Cloud Function:
exports.app = functions.https.onRequest((req: Request, res: Response) => bot.handleUpdate(req.body, res));


