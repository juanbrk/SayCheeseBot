import {Scenes, Telegraf} from "telegraf";
import {ExtendedContext} from "../config/context/myContext";
import functions = require("firebase-functions/v1");
import {MenuMiddleware} from "telegraf-inline-menu";
import {messageHandler} from "./handlers/updates/message";
import {renovarVencimientoSesion, soloUsuariosPermitidos} from "./handlers/middlewares";
import {menu} from "./handlers/menus/index";
import {db} from "./firebase";
import firestoreSession = require("telegraf-session-firestore");
import {superWizard} from "./modules/scenes/registrarCliente";
import {cobroWizard} from "./modules/scenes/registrarCobro";
import {wizardNuevoPago} from "./modules/scenes/pagos/registrarNuevoPago";
import {wizardSaldarDeuda} from "./modules/scenes/saldos/registrarSaldoDeudaMensual";
import {wizardMovimientosCobro} from "./modules/scenes/cobro/visualizarMovimientos";
import {wizardSaldoDeudaTotal} from "./modules/scenes/saldos/registrarSaldoDeudaTotal";
import {wizardMovimientosPagos} from "./modules/scenes/pagos/visualizarMovimientosPagos";

/**
 * Arma el bot completo —middlewares, scenes, menús, comandos, manejo de errores—
 * y devuelve la instancia lista para usar.
 *
 * Es una FACTORY y no un singleton de módulo a propósito. Hay dos consumidores con
 * ciclos de vida distintos:
 *
 *   - `index.ts`  → producción, webhook. Construye el bot recién dentro del handler
 *                   de `api`, cuando ya hay un request y el entorno del runtime está
 *                   cargado.
 *   - `dev.ts`    → desarrollo, polling contra los emuladores, con el token del bot
 *                   de test.
 *
 * Construir el bot al importar obligaba al placeholder "0:DISCOVERY-ONLY": tanto
 * `firebase deploy` como el emulador cargan el entrypoint en una fase de discovery
 * —sólo para enumerar qué functions exporta— donde `TELEGRAM_TOKEN` todavía no está
 * inyectado, y `new Telegraf(undefined)` tira. Con la factory, durante discovery
 * nadie llama a `crearBot` y el problema deja de existir.
 *
 * ⚠️ Importar este módulo SÍ tiene un efecto: arrastra `./firebase`, que llama a
 * `initializeApp()`. `dev.ts` depende de eso y por eso requiere el módulo recién
 * después de validar que `FIRESTORE_EMULATOR_HOST` esté seteado.
 *
 * @param token Token de @BotFather. Prod y test usan tokens distintos.
 */
export function crearBot(token: string): Telegraf<ExtendedContext> {
  const stage = new Scenes.Stage<ExtendedContext>([
    superWizard,
    cobroWizard,
    wizardNuevoPago,
    wizardSaldarDeuda,
    wizardMovimientosCobro,
    wizardMovimientosPagos,
    wizardSaldoDeudaTotal,
  ]);

  // `webhookReply: true` es inofensivo en polling: el atajo de telegraf sólo se activa
  // si hay un `response` HTTP abierto, y en `bot.launch()` no existe ninguno.
  const bot = new Telegraf<ExtendedContext>(token, {telegram: {webhookReply: true}});

  // --------------------------- MIDDLEWARE -------------------------------
  // Va primero: sin allowlist, un usuario no autorizado igual generaría un doc en
  // `sessions` y entraría a las scenes antes de que nada lo frene.
  bot.use(soloUsuariosPermitidos());
  bot.use(firestoreSession(db.collection("sessions")));
  // Tiene que ir después de `firestoreSession`: escribe en `ctx.session`, y esa sesión
  // recién existe (y se guarda al volver de `next()`) dentro de ese middleware.
  bot.use(renovarVencimientoSesion());
  bot.use(stage.middleware());

  const menuMiddleware = new MenuMiddleware("/", menu);

  // --------------------------- COMMANDS -------------------------------
  bot.start((ctx) => menuMiddleware.replyToContext(ctx));
  bot.command("menu", (ctx) => menuMiddleware.replyToContext(ctx));

  bot.on("message", async (ctx) => messageHandler(ctx));

  // --------------------------- ERROR HANDLING -------------------------------
  // Nunca tiene que rechazar: si lo hace, `handleUpdate` falla, Telegram reintenta el
  // update entero y un cobro o pago ya guardado se registra dos veces. Y el error que
  // llega acá suele ser justamente un envío rechazado (bloqueado, 429, 400), así que el
  // aviso al usuario puede fallar por la misma causa.
  // Se loguea `ctx.update` y no `ctx`: el contexto entero trae `ctx.telegram.token`, y
  // `util.format` lo imprime tal cual en Cloud Logging.
  bot.catch(async (err: unknown, ctx: ExtendedContext) => {
    functions.logger.error("[Bot] Error", err);
    functions.logger.error("[Bot] Update que falló", ctx.update);
    try {
      await ctx.reply("Error");
    } catch (errorAlAvisar) {
      functions.logger.error("[Bot] No se pudo avisar el error al usuario", errorAlAvisar);
    }
  });

  // El menú de comandos de Telegram (`setMyCommands`) se registra UNA sola vez por bot,
  // a mano, y está documentado en el README junto al setWebhook. Acá había una llamada
  // sin await en el scope del módulo: salía a la red en cada cold start y también durante
  // el análisis de `firebase deploy`, con unhandled rejection si el token era inválido —
  // que en Node 22 tumba el proceso.

  bot.use(menuMiddleware.middleware());

  return bot;
}
