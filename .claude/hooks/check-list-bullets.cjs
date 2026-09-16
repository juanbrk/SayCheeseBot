#!/usr/bin/env node
"use strict";

/**
 * check-list-bullets.cjs — PreToolUse hook (matcher: Edit|Write|MultiEdit)
 *
 * Bloquea caracteres de árbol y `•` en el texto que se está por escribir a un
 * archivo `.ts`. Ninguno se renderiza en Telegram: le llegan al usuario como texto
 * crudo dentro de un `ctx.reply`/`ctx.editMessageText`.
 *
 * La convención de este repo es `- `, no `•` — evidencia: 0 ocurrencias de `•` en
 * todo el árbol, 0 de caracteres de árbol (`├─`, `└─`, `│`), y 37 líneas de lista con
 * `- ` en template literals de respuestas reales (`registrarCobro.ts:165-169`, entre
 * otras). Por eso el mensaje de remediación manda a `- ` y no repite el `•` que
 * sugiere el hook de origen en kakebot-backend — ahí sería importar exactamente la
 * convención que rompe este repo.
 *
 * Alcance: el archivo entero, no sólo las líneas dentro de un `ctx.reply` — igual que
 * el hook de origen. Acotar a "sólo dentro de un template literal que alimenta
 * ctx.reply" exigiría parsear TypeScript; el árbol da 0 violaciones con el alcance
 * simple, así que no hay ROI en la versión más cara.
 *
 * Sólo mira el texto nuevo (`content`/`new_string`/`edits[].new_string`), no el
 * archivo mergeado — a diferencia de check-scene-wizard (P8), acá no hace falta ver
 * el archivo resultante completo: un carácter prohibido en el texto que se agrega hoy
 * es una violación hoy, sin importar qué hay en el resto del archivo.
 *
 * Exit 2 + stderr para bloquear (sólo PreToolUse); exit 0 en cualquier otro camino.
 */

const fs = require("fs");
const { textoNuevo } = require("./lib/hook-utils.cjs");

/** Caracteres de árbol y el bullet no-convencional, cada uno con su nombre para el mensaje. */
const CARACTERES_PROHIBIDOS = [
  { char: "├─", nombre: "├─" },
  { char: "└─", nombre: "└─" },
  { char: "│", nombre: "│" },
  { char: "•", nombre: "•" },
];

function esArchivoTypeScript(filePath) {
  return typeof filePath === "string" && filePath.endsWith(".ts");
}

function encontrarViolaciones(contenido) {
  const violaciones = [];
  contenido.split("\n").forEach((linea, indice) => {
    for (const { char, nombre } of CARACTERES_PROHIBIDOS) {
      if (linea.includes(char)) {
        violaciones.push({ linea: indice + 1, nombre });
        break;
      }
    }
  });
  return violaciones;
}

function main() {
  const payload = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  if (!/^(Edit|Write|MultiEdit)$/.test(payload.tool_name || "")) return;

  const toolInput = payload.tool_input || {};
  const filePath = toolInput.file_path || "";
  if (!esArchivoTypeScript(filePath)) return;

  const contenido = textoNuevo(toolInput);
  if (!contenido) return;

  const violaciones = encontrarViolaciones(contenido);
  if (violaciones.length === 0) return;

  const detalle = violaciones
    .map((v) => `  línea ${v.linea}: carácter "${v.nombre}" no permitido`)
    .join("\n");

  process.stderr.write(
    "\n🚫 [list-bullets] BLOQUEADO: carácter de lista no válido en texto de Telegram.\n" +
      detalle +
      "\n\n`├─`, `└─`, `│` y `•` no se renderizan en Telegram — llegan como texto crudo.\n" +
      "Usá `- ` para los ítems de lista (la convención de este repo).\n\n"
  );
  process.exit(2);
}

try {
  main();
} catch (_) {
  // Fail open.
}
process.exit(0);
