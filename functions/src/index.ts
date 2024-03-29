import {Scenes, Telegraf} from "telegraf";
import {Request, Response} from "express";
import {ExtendedContext} from "../config/context/myContext";
import functions = require("firebase-functions");
import {MenuMiddleware} from "telegraf-inline-menu/dist/source";
import {messageHandler} from "./handlers/updates/message";
import {onBalanceCreated} from "./controllers/balance-controller";
import {onResumenAlterado} from "./controllers/resumen-controller";
import {menu} from "./handlers/menus/index";
import admin = require("firebase-admin");
import firestoreSession = require("telegraf-session-firestore");
import {superWizard} from "./modules/scenes/registrarCliente";
import {cobroWizard} from "./modules/scenes/registrarCobro";
import {wizardNuevoPago} from "./modules/scenes/pagos/registrarNuevoPago";
import {wizardSaldarDeuda} from "./modules/scenes/saldos/registrarSaldoDeudaMensual";
import {wizardMovimientosCobro} from "./modules/scenes/cobro/visualizarMovimientos";
import {wizardSaldoDeudaTotal} from "./modules/scenes/saldos/registrarSaldoDeudaTotal";
import {wizardMovimientosPagos} from "./modules/scenes/pagos/visualizarMovimientosPagos";

admin.initializeApp();
const stage = new Scenes.Stage<ExtendedContext>([superWizard, cobroWizard, wizardNuevoPago, wizardSaldarDeuda, wizardMovimientosCobro, wizardMovimientosPagos, wizardSaldoDeudaTotal]);
export const db = admin.firestore();
const telegramToken: string = functions.config().telegram.token;
if (telegramToken === undefined) {
  throw new Error("BOT TOKEN must be provided");
}
export const bot = new Telegraf<ExtendedContext>(telegramToken, {telegram: {webhookReply: true}});

// --------------------------- MIDDLEWARE -------------------------------
bot.use(firestoreSession(db.collection("sessions")));
bot.use(stage.middleware());
// bot.use(async (ctx, next) => {
//   console.log(ctx.session);
//   console.log(menuMiddleware.tree());
//   return next();
// });


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
  {command: "start", description: "Iniciar"},
  {command: "menu", description: "Menú"},
  {command: "help", description: "Ayuda"},
  {command: "settings", description: "Configuraciones"},
]);


bot.use(menuMiddleware.middleware());
// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest((req: Request, res: Response) => bot.handleUpdate(req.body, res));

// Listeners

exports.onBalanceCreated = onBalanceCreated;
exports.onResumenAlterado = onResumenAlterado;


