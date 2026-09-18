#!/usr/bin/env node
"use strict";

/**
 * env-change-guard.cjs — PostToolUse hook (matcher: Edit|Write|MultiEdit)
 *
 * Avisa cuando se edita un archivo de entorno bajo functions/, con un mensaje distinto
 * según cuál — acá no hay GitHub Secrets, `.pending-secrets` ni `npm run go → Prod`
 * (eso es kakebot-backend, no este repo), así que el mensaje de origen se reescribe
 * entero sobre lo que de verdad pasa en este árbol:
 *
 *   - `functions/.env` es la fuente de verdad de producción. `firebase.json` dispara
 *     `predeploy` → `npm run build` sobre `functions/`, y el CLI de Firebase sube
 *     `functions/.env` como variables de entorno de la function al desplegar
 *     (`firebase deploy --only functions`) — no hay otro mecanismo. El archivo está
 *     gitignoreado: el cambio vive sólo en esta máquina hasta ese deploy.
 *   - `functions/.env.local` NO se sube nunca: `firebase-tools` lo excluye a propósito
 *     del deploy para que un override local no se filtre a producción. Sólo lo lee
 *     `dev.ts` (`dotenv.config({path: ".env"})` y después `.env.local` con
 *     `override: true`, ver `src/dev.ts`), y sólo pisa `.env` en desarrollo.
 *   - Cualquier otro `.env.<algo>` (p.ej. `.env.<projectId>` o `.env.<alias>`) es un
 *     archivo específico de proyecto/alias que `firebase-tools` carga sólo si el
 *     proyecto activo coincide con ese sufijo.
 *
 * `.env.example` queda afuera a propósito: es el único registro versionado de qué
 * variables existen (README.md manda a copiarlo) y no es un archivo de secretos.
 *
 * Exit 0 siempre — PostToolUse no puede bloquear.
 */

const path = require("path");
const { resolveRoot, readPayload, resolveEditedPath, writeAdditionalContext } =
  require("./lib/hook-utils.cjs");

/**
 * @param {string} basename nombre de archivo, p.ej. ".env.local"
 * @return {string | null} categoría del archivo de entorno, o null si no aplica
 */
function clasificar(basename) {
  if (basename === ".env.example") return null;
  if (basename === ".env") return "prod";
  if (basename === ".env.local") return "local";
  if (/^\.env\.[^.]+$/.test(basename)) return "alias";
  return null;
}

function mensaje(categoria, rel) {
  if (categoria === "prod") {
    return (
      `Se editó ${rel} — es la fuente de verdad de producción.\n\n` +
      "El cambio no llega a producción hasta correr `firebase deploy --only functions` " +
      "(el CLI sube este archivo como variables de entorno de la function en ese momento, " +
      "no antes). Está gitignoreado: vive sólo en esta máquina, sin CI que lo reconstruya.\n\n" +
      "Si agregaste una key nueva, sumala también a `functions/.env.example` (es el único " +
      "registro versionado de qué variables existen). Si cambiaste TELEGRAM_TOKEN, hay que " +
      "re-registrar el webhook a mano (ver README.md, sección \"Registrar el webhook\").\n\n" +
      "Nota: `functions/.env.local`, si existe, pisa esta clave en desarrollo (`npm run go`) — " +
      "un cambio acá puede no verse hasta que se borre o se actualice ese override."
    );
  }
  if (categoria === "local") {
    return (
      `Se editó ${rel} — sólo afecta desarrollo local.\n\n` +
      "`firebase-tools` excluye `.env.local` del deploy a propósito: nunca se sube a " +
      "producción. Sólo lo lee `dev.ts`, y sólo pisa `functions/.env` mientras corre " +
      "`npm run go` — no hace falta desplegar para que este cambio tenga efecto."
    );
  }
  // alias
  return (
    `Se editó ${rel} — archivo de entorno específico de proyecto/alias.\n\n` +
    "`firebase-tools` sólo lo carga en el deploy si el proyecto activo coincide con el " +
    "sufijo del nombre. Confirmá que ese sufijo es el project id o alias real antes de " +
    "asumir que esta clave se va a usar."
  );
}

function main() {
  const payload = readPayload();
  if (!/^(Edit|Write|MultiEdit)$/.test(payload.tool_name || "")) return;

  const filePath = (payload.tool_input && payload.tool_input.file_path) || "";
  if (!filePath) return;

  const categoria = clasificar(path.basename(filePath));
  if (!categoria) return;

  const root = resolveRoot(payload.cwd);
  if (!root) return;

  const base = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const edited = resolveEditedPath(base, filePath);

  const rel = path.relative(root, edited);
  if (rel.startsWith("..") || !rel.startsWith(`functions${path.sep}`)) return;

  writeAdditionalContext("PostToolUse", mensaje(categoria, rel.split(path.sep).join("/")));
}

try {
  main();
} catch (_) {
  /* nunca bloquear */
}
process.exit(0);
