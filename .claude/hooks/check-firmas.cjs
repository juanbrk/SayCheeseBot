#!/usr/bin/env node
"use strict";

/**
 * check-firmas.cjs — PreToolUse hook (matcher: Edit|Write|MultiEdit)
 *
 * Impone las 2 reglas de firma de `.claude/rules/convenciones-codigo.md` — no las 3 de
 * kakebot-backend: la tercera (prohibir destructuring en el cuerpo de una función) se
 * descarta a propósito acá, porque da 19 ocurrencias en 11 archivos de este árbol. Eso
 * no es deuda, es la convención local (ver "Descartada" en el reglamento).
 *
 * Regla 1 — 4+ parámetros posicionales: delegada a lib/params-rule.cjs
 * (findViolations), que trae el arreglo del defecto 3 del Contexto de TICKET.md
 * (números de línea corridos por el strip de comentarios/templates multilínea de
 * kakebot).
 *
 * Regla 2 — tipo inline en la firma (patrón `}: {`): se prueba línea por línea con
 * /\}[ \t]*:[ \t]*\{/, NO con el /\}\s*:\s*\{/ de kakebot (defecto 2 del Contexto). Esa
 * versión usa `\s`, que incluye `\n`, y matchea de punta a punta cualquier ternario
 * multilínea — 2 falsos positivos reales contra este árbol:
 * `scenes/cobro/visualizarMovimientos.ts:98-105` y
 * `scenes/pagos/visualizarMovimientosPagos.ts:99-106`. El regex anclado a la línea da 0
 * en ambos. Reusa `stripStringsAndComments` de lib/params-rule.cjs (mismo arreglo del
 * defecto 3) para no disparar sobre texto dentro de un comentario o un string.
 *
 * Sólo mira el texto nuevo (content/new_string/edits[].new_string), igual que
 * check-list-bullets — no el archivo mergeado: la firma que se está escribiendo hoy
 * está contenida en el diff de hoy.
 *
 * Exit 2 + stderr para bloquear (sólo PreToolUse); exit 0 en cualquier otro camino.
 */

const { readPayload, textoNuevo } = require("./lib/hook-utils.cjs");
const { findViolations, stripStringsAndComments } = require("./lib/params-rule.cjs");

const TIPO_INLINE = /\}[ \t]*:[ \t]*\{/;

function esArchivoTypeScript(filePath) {
  return (
    typeof filePath === "string" &&
    filePath.endsWith(".ts") &&
    !filePath.endsWith(".d.ts")
  );
}

/** @param {string} contenido @return {string[]} */
function violacionesTipoInline(contenido) {
  const limpio = stripStringsAndComments(contenido);
  const violaciones = [];
  limpio.split("\n").forEach((linea, indice) => {
    if (TIPO_INLINE.test(linea)) {
      violaciones.push(
        `línea ${indice + 1}: tipo inline en la firma (\`}: {\`) — definí una interfaz aparte`
      );
    }
  });
  return violaciones;
}

function main() {
  const payload = readPayload();
  if (!/^(Edit|Write|MultiEdit)$/.test(payload.tool_name || "")) return;

  const toolInput = payload.tool_input || {};
  const filePath = toolInput.file_path || "";
  if (!esArchivoTypeScript(filePath)) return;

  const contenido = textoNuevo(toolInput);
  if (!contenido) return;

  const violacionesParams = findViolations(contenido).map(
    (v) => `${v} — usá un parámetro objeto`
  );
  const violaciones = [...violacionesParams, ...violacionesTipoInline(contenido)];
  if (violaciones.length === 0) return;

  const detalle = violaciones.map((v) => `  ${v}`).join("\n");

  process.stderr.write(
    "\n🚫 [check-firmas] BLOQUEADO: violación de las reglas de firma.\n" +
      detalle +
      "\n\nVer .claude/rules/convenciones-codigo.md > Reglas de firma.\n\n"
  );
  process.exit(2);
}

try {
  main();
} catch (_) {
  // Fail open.
}
process.exit(0);
