import path from "path";
import dotenv from "dotenv";

/**
 * dev.ts — bot en polling contra el emulador, para desarrollo local (Fase E).
 *
 * NUNCA se importa `./bot` (ni transitivamente `./firebase`) al tope del archivo: eso
 * ejecutaría `initializeApp()` antes de que la guarda de Firestore corra. Por eso el
 * `require("./bot")` de más abajo es un `require` en el cuerpo de una función y no un
 * `import` — con `module: "commonjs"` los `import` se emiten como `require` al tope del
 * archivo, en el orden de escritura, y eso rompería el orden que estas guardas necesitan.
 *
 * Corre TRES guardas, en este orden, antes de tocar la API de Telegram:
 *
 *   1. Lee TELEGRAM_TOKEN_TEST — nunca TELEGRAM_TOKEN. El token de prod ni se referencia
 *      en este archivo: no puede llegar acá por un typo o un copy-paste.
 *   2. FIRESTORE_EMULATOR_HOST apunta a loopback, validado ANTES de requerir `./bot`.
 *      Sandboxea Firestore, pero no alcanza sola: la API de Telegram no tiene emulador
 *      y es estado global compartido con producción — de ahí la guarda 3.
 *   3. `getMe()` confirma que el token responde como @botito_testitoBot, ANTES de
 *      `launch()`. Es la guarda crítica: `launch()` llama a `deleteWebhook()` sola e
 *      incondicionalmente (telegraf.js:192), así que con el token de prod por error acá
 *      dejaría a @estudiolata_bot sin webhook y sin un solo error visible.
 */

const RAIZ = path.resolve(__dirname, "..", "..");

// Mismo orden que el loader nativo de functions (env.js): .env primero, .env.local
// después y pisando — ahí vive TELEGRAM_TOKEN_TEST (ver E2b en TICKET.md).
dotenv.config({path: path.join(RAIZ, ".env")});
dotenv.config({path: path.join(RAIZ, ".env.local"), override: true});

const USERNAME_ESPERADO = "botito_testitoBot";
const EMULATOR_HOST_RE = /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/;

function abortar(motivo: string): never {
  console.error(`[dev] ${motivo}`);
  process.exit(1);
}

async function main() {
  // ── guarda 1: sólo el token de test ──────────────────────────────────────
  const token = process.env.TELEGRAM_TOKEN_TEST;
  if (!token) {
    abortar(
      "Falta TELEGRAM_TOKEN_TEST en functions/.env.local. Ver E1/E2b en TICKET.md: " +
        "hay que crear @botito_testitoBot en BotFather y cargar su token ahí."
    );
    return;
  }

  // ── guarda 2: Firestore apunta al emulador, no a producción ──────────────
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (!firestoreHost || !EMULATOR_HOST_RE.test(firestoreHost)) {
    abortar(
      `FIRESTORE_EMULATOR_HOST="${firestoreHost ?? ""}" no apunta a loopback. ` +
        "dev.ts sólo corre contra el emulador — nunca contra Firestore de producción."
    );
    return;
  }

  // Recién acá se requiere ./bot (y transitivamente ./firebase → initializeApp()),
  // con las dos guardas anteriores ya en verde.
  type BotModule = typeof import("./bot");
  const {crearBot} = require("./bot") as BotModule;

  const bot = crearBot(token);

  // ── guarda 3: el token responde como el bot de test, no como el de prod ──
  const me = await bot.telegram.getMe();
  if (me.username !== USERNAME_ESPERADO) {
    abortar(
      `TELEGRAM_TOKEN_TEST responde como @${me.username}, se esperaba ` +
        `@${USERNAME_ESPERADO}. Abortando ANTES de launch(): launch() borra el ` +
        "webhook del bot que sea, sin avisar."
    );
    return;
  }

  // NO se hace `await` acá: `launch()` sólo resuelve cuando el polling se corta —
  // await-earla bloquearía este main() para siempre y el resto del archivo (el log
  // de arranque, las guardas de señales) jamás correría. `deleteWebhook()`, que sí
  // corre antes de arrancar el loop, sigue estando cubierto por este `.catch`.
  bot.launch().catch((err) => {
    console.error("[dev] launch() falló:", err);
    process.exit(1);
  });

  console.log(`[dev] @${me.username} arriba en polling contra el emulador (${firestoreHost}).`);

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("[dev] Error fatal:", err);
  process.exit(1);
});
