import {Telegraf} from "telegraf";
import {ExtendedContext} from "../config/context/myContext";
import functions = require("firebase-functions/v1");
import {crearBot} from "./bot";
import {onBalanceCreated} from "./controllers/balance-controller";
import {onResumenAlterado} from "./controllers/resumen-controller";

/**
 * Entrypoint de Cloud Functions. Exporta ÚNICAMENTE functions.
 *
 * El loader de firebase-functions v7 recorre todos los exports de este archivo para
 * descubrir functions anidadas; cualquier otra cosa exportada acá lo manda a caminar
 * grafos de objetos que no le corresponden (ver el comentario en `firebase.ts`).
 */

// El bot se construye en el primer request y se reusa mientras viva la instancia.
// No se construye al importar: `firebase deploy` y el emulador cargan este archivo en
// una fase de discovery donde `TELEGRAM_TOKEN` todavía no está inyectado.
let bot: Telegraf<ExtendedContext> | undefined;

exports.api = functions.https.onRequest(async (req, res) => {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    functions.logger.error("Falta TELEGRAM_TOKEN. Cargalo en functions/.env (ver .env.example).");
    res.status(500).send("Bot mal configurado: falta TELEGRAM_TOKEN");
    return;
  }

  if (!bot) bot = crearBot(token);

  return bot.handleUpdate(req.body, res);
});

// Listeners
exports.onBalanceCreated = onBalanceCreated;
exports.onResumenAlterado = onResumenAlterado;
