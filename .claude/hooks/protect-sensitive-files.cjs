#!/usr/bin/env node
"use strict";

/**
 * protect-sensitive-files.cjs — PreToolUse hook (matcher: Read|Grep)
 *
 * Bloquea la lectura de secretos. El conjunto bloqueado no es una lista fija de
 * basenames (de los 3 de kakebot sólo existe `.env` acá) sino la regla que ya está
 * escrita en `functions/.gitignore:11-13`: todo `/^\.env(\..+)?$/` **excepto**
 * `.env.example`, más `/^serviceAccountKey\./` (`.gitignore:29`). Eso cubre lo que hay
 * (`.env`, `.env.local`) y lo que el deploy podría agregar mañana — `firebase-tools`
 * busca también `.env.<projectId>` y `.env.<alias>`.
 *
 * `.env.example` queda afuera a propósito: README.md manda a copiarlo y es el único
 * registro versionado de qué variables existen.
 *
 * Dos huecos conocidos, documentados en TICKET.md > Diferido, no resueltos acá:
 *   - `Grep` recibe en `tool_input.path` un directorio, así que un grep sobre
 *     `functions/` entero pasa el hook.
 *   - `Bash: cat functions/.env` no lo cubre ningún matcher.
 * Cerrarlos es un hook aparte con su propia superficie de falsos positivos.
 *
 * Exit 2 + stderr para bloquear (sólo PreToolUse); exit 0 en cualquier otro camino.
 */

const path = require("path");
const { readPayload } = require("./lib/hook-utils.cjs");

const ENV_SECRETO = /^\.env(\..+)?$/;
const SERVICE_ACCOUNT = /^serviceAccountKey\./;

function esSensible(basename) {
  if (basename === ".env.example") return false;
  return ENV_SECRETO.test(basename) || SERVICE_ACCOUNT.test(basename);
}

function main() {
  const payload = readPayload();
  const toolName = payload.tool_name || "";
  if (!/^(Read|Grep)$/.test(toolName)) return;

  const input = payload.tool_input || {};
  const target = toolName === "Read" ? input.file_path : input.path;
  if (!target) return;

  const basename = path.basename(String(target));
  if (!esSensible(basename)) return;

  process.stderr.write(
    "\n🚫 BLOQUEADO: lectura de archivo sensible (" +
      basename +
      ").\n" +
      "Contiene secretos (tokens, credenciales) y no se puede leer desde acá.\n" +
      "Si necesitás saber qué variables existen, mirá `functions/.env.example`.\n\n"
  );
  process.exit(2);
}

try {
  main();
} catch (_) {
  // Fail open.
}
process.exit(0);
