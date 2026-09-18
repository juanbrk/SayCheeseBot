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

/**
 * Palabras que van seguidas de `(` pero nunca abren una definición de función. Sin esta
 * lista, `if (...) {`, `while (...) {` y `switch (...) {` entrarían por el patrón de
 * método, que es el más laxo de los cuatro.
 */
const PALABRAS_NO_FUNCION = new Set([
  "if", "for", "while", "switch", "catch", "return", "typeof", "await", "new", "do",
  "else", "with", "function", "yield", "case", "delete", "void", "in", "of",
  "instanceof", "const", "let", "var", "import", "export", "default", "throw",
]);

/** `function nombre(` — declaración, con o sin `export`/`async` adelante. */
const DECLARACION = /\bfunction\s+(\w+)\s*\(/g;

/** `const nombre = (`, `let nombre: Tipo = async (`, `const nombre = function (`. */
const ASIGNACION =
  /\b(?:const|let|var)\s+(\w+)\s*(?::[^=;]*?)?=\s*(?:async\s+)?(function\s*\*?\s*\w*\s*)?(?:<[^>()]*>\s*)?\(/g;

/** Método de clase o de objeto literal: anclado al inicio de línea, con modificadores. */
const METODO =
  /(?:^|\n)[ \t]*(?:(?:public|private|protected|static|readonly|abstract|override|async|get|set)\s+)*(\w+)\s*(?:<[^>()]*>\s*)?\(/g;

/** Propiedad con arrow: `nombre: (a, b) => …`, en objeto literal o en un tipo. */
const PROPIEDAD_ARROW = /(?:^|\n)[ \t]*(\w+)\s*:\s*(?:async\s+)?(?:<[^>()]*>\s*)?\(/g;

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
 * Índice del `)` que cierra el bloque abierto en `openParen`.
 * @param {string} src @param {number} openParen @return {number}
 */
function indiceDeCierre(src, openParen) {
  let depth = 1;
  let i = openParen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") depth--;
    i++;
  }
  return i - 1;
}

/**
 * Confirma que el bloque de paréntesis que arranca en `openParen` es de verdad la lista
 * de parámetros de una función, mirando lo que viene DESPUÉS del cierre: `=>` (arrow) o
 * `{` (cuerpo), con un tipo de retorno opcional en el medio. Es lo que separa una
 * definición de una llamada — `guardar(a, b, c, d);` cierra contra `;` y queda afuera.
 * @param {string} src @param {number} openParen @return {boolean}
 */
function abreUnaFuncion(src, openParen) {
  const resto = src.slice(indiceDeCierre(src, openParen) + 1);
  return /^\s*(?::[^=;{]*)?(?:=>|\{)/.test(resto);
}

/**
 * Junta los candidatos a definición de función, por las cuatro formas que existen en
 * TypeScript. Deduplicado por la posición del `(`: una misma definición puede matchear
 * más de un patrón.
 * El número de línea sale del `(`, no del inicio del match: los patrones anclados a
 * inicio de línea consumen el `\n` anterior, así que `m.index` cae en la línea de arriba.
 *
 * @param {string} cleaned código ya sin strings ni comentarios
 * @return {Array<{nombre: string, openParen: number}>}
 */
function encontrarDefiniciones(cleaned) {
  const porParen = new Map();

  /** @param {RegExp} regex @param {boolean} exigirFuncion */
  const recolectar = (regex, exigirFuncion) => {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(cleaned)) !== null) {
      const nombre = m[1];
      if (!nombre || PALABRAS_NO_FUNCION.has(nombre)) continue;
      const openParen = m.index + m[0].length - 1;
      if (porParen.has(openParen)) continue;
      if (exigirFuncion && !abreUnaFuncion(cleaned, openParen)) continue;
      porParen.set(openParen, {nombre, openParen});
    }
  };

  // La declaración no necesita el chequeo de cierre: `function nombre(` ya es inequívoco.
  recolectar(DECLARACION, false);
  recolectar(ASIGNACION, true);
  recolectar(METODO, true);
  recolectar(PROPIEDAD_ARROW, true);

  // Orden de aparición en el archivo: los cuatro patrones corren uno después del otro, así
  // que el orden del Map es por patrón, no por posición.
  return [...porParen.values()].sort((a, b) => a.openParen - b.openParen);
}

/**
 * Busca funciones con 4+ parámetros posicionales en código TypeScript.
 *
 * Cubre las cuatro formas de definir una función en este árbol: declaración
 * (`function f(...)`), asignación a un nombre (`const f = (...) =>`, `const f =
 * function (...)`), método de clase u objeto literal, y propiedad con arrow
 * (`f: (...) => …`). La forma no cambia el olor que la regla persigue: una firma
 * posicional larga es igual de frágil se escriba como se escriba.
 *
 * Lo único deliberadamente afuera son los callbacks anónimos inline
 * (`.reduce((acc, cur, idx, arr) => …)`): su aridad no la elige quien los escribe sino
 * la API que los invoca, así que un parámetro objeto no es un arreglo disponible.
 *
 * @param {string} content texto crudo (se le sacan comentarios/strings acá adentro)
 * @param {string} [sufijoLinea] aclaración para el número de línea cuando `content` es un
 *   fragmento y no el archivo entero (ver `sufijoDeLinea` en lib/hook-utils.cjs)
 * @return {string[]} descripciones de violación (vacío = limpio)
 */
function findViolations(content, sufijoLinea = "") {
  const cleaned = stripStringsAndComments(content);
  const violations = [];

  for (const {nombre, openParen} of encontrarDefiniciones(cleaned)) {
    const paramBlock = extractParamBlock(cleaned, openParen);

    if (paramBlock.trim().startsWith("{")) continue;

    const commas = countTopLevelCommas(paramBlock);
    const hasTrailingComma = paramBlock.trim().endsWith(",");
    const paramCount = commas + 1 - (hasTrailingComma ? 1 : 0);
    if (paramCount < 4) continue;

    const lineNum = cleaned.slice(0, openParen).split("\n").length;
    violations.push(
      `línea ${lineNum}${sufijoLinea}: \`${nombre}\` — ${paramCount} parámetros posicionales`
    );
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
