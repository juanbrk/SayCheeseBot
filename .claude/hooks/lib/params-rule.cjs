"use strict";

/**
 * params-rule.cjs — lógica compartida de las 2 reglas de firma. La usa
 * check-firmas.cjs (PreToolUse, bloqueante).
 *
 * Portado de kakebot-backend (`params-rule-core.js`) con el arreglo del defecto 3 del
 * Contexto de TICKET.md: el stripper de comentarios de origen reemplazaba cada bloque
 * `/* ... *\/` (y cada template literal multilínea) por un literal corto de una sola
 * línea, así que cualquier número de línea reportado después del bloque quedaba
 * corrido — kakebot documentaba "línea 85" para una violación que en realidad estaba
 * en la 112. Acá cada reemplazo conserva únicamente los saltos de línea que tenía
 * adentro, así el conteo de líneas post-strip siempre coincide con el texto real.
 */

/**
 * Reemplaza cada match de `regex` por una versión que sólo conserva los saltos de
 * línea que contenía, para no correr el conteo de líneas del resto del texto.
 * @param {string} src
 * @param {RegExp} regex debe tener el flag "g"
 * @return {string}
 */
function stripPreservingLines(src, regex) {
  return src.replace(regex, (m) => m.replace(/[^\n]/g, ""));
}

/**
 * Saca comentarios y literales de string/template del código, para que ninguna de las
 * dos reglas de firma dispare sobre texto que está dentro de un comentario o un
 * string.
 * @param {string} src
 * @return {string}
 */
function stripStringsAndComments(src) {
  let result = src;
  result = result.replace(/\/\/[^\n]*/g, "");
  result = stripPreservingLines(result, /\/\*[\s\S]*?\*\//g);
  result = stripPreservingLines(result, /`(?:\\.|[^`\\])*`/g);
  result = result.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  result = result.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  return result;
}

/** @param {string} paramBlock @return {number} */
function countTopLevelCommas(paramBlock) {
  let depth = 0;
  let commas = 0;
  for (const ch of paramBlock) {
    if ("<({[".includes(ch)) depth++;
    else if (">)}]".includes(ch)) depth--;
    else if (ch === "," && depth === 0) commas++;
  }
  return commas;
}

/** @param {string} src @param {number} openParen @return {string} */
function extractParamBlock(src, openParen) {
  let depth = 1;
  let i = openParen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") depth--;
    i++;
  }
  return src.slice(openParen + 1, i - 1);
}

/**
 * Busca funciones con 4+ parámetros posicionales en código TypeScript.
 * @param {string} content texto crudo (se le sacan comentarios/strings acá adentro)
 * @return {string[]} descripciones de violación (vacío = limpio)
 */
function findViolations(content) {
  const cleaned = stripStringsAndComments(content);
  const violations = [];
  const FN_REGEX = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;

  let match;
  while ((match = FN_REGEX.exec(cleaned)) !== null) {
    const fnName = match[1];
    const openParen = match.index + match[0].length - 1;
    const paramBlock = extractParamBlock(cleaned, openParen);

    if (paramBlock.trim().startsWith("{")) continue;

    const commas = countTopLevelCommas(paramBlock);
    const hasTrailingComma = paramBlock.trim().endsWith(",");
    const paramCount = commas + 1 - (hasTrailingComma ? 1 : 0);
    if (paramCount < 4) continue;

    const lineNum = cleaned.slice(0, match.index).split("\n").length;
    violations.push(`línea ${lineNum}: \`${fnName}\` — ${paramCount} parámetros posicionales`);
  }

  return violations;
}

/**
 * true si el path es TypeScript chequeable (no `.d.ts`).
 * @param {string} filePath
 * @return {boolean}
 */
function isCheckableFile(filePath) {
  return (
    typeof filePath === "string" &&
    filePath.endsWith(".ts") &&
    !filePath.endsWith(".d.ts")
  );
}

module.exports = { findViolations, isCheckableFile, stripStringsAndComments };
