#!/usr/bin/env node
"use strict";

/**
 * check-scene-wizard.cjs — cableado dual, un solo archivo:
 *   - PreToolUse  (matcher: Edit|Write|MultiEdit) → bloqueante
 *   - PostToolUse (matcher: Edit|Write|MultiEdit) → advisory
 *
 * No es un port estructural de `check-wizard-scene.js` de kakebot-backend — ese hook
 * impone una ceremonia (CANCEL_REGEX literal, `getMessageText`, `repromptCurrentStep`,
 * prefijos `step*`/`handle*`, `_SCENE_ID`) que da **0/7** contra este árbol (ver
 * "La ceremonia completa de wizard de kakebot" en convenciones-codigo.md). Lo que se
 * porta es el mecanismo (PreToolUse que reconstruye el archivo mergeado y corre checks
 * estructurales por regex) aplicado a los 14 invariantes reales de este repo,
 * documentados en `.claude/rules/convenciones-codigo.md`, cada uno verificado 7/7
 * contra las 7 scenes actuales.
 *
 * Un archivo bajo `functions/src/modules/scenes/**` que NO define
 * `new Scenes.WizardScene(` no está sujeto a nada de esto — así es como `general.ts`
 * (que no define ninguna scene) queda afuera sin necesidad de excluirlo por nombre.
 *
 * Recorte deliberado (P8 en TICKET.md marca este hook como "candidato designado a
 * recortar"): no se imponen las dos variantes de "manejo de mensaje inesperado"
 * (`repetirPaso` vs `volverAlInicio`) — convenciones-codigo.md ya documenta por qué:
 * no hay una firma de texto estable que las distinga sin acoplarse al nombre exacto
 * del helper, y `registrarSaldoDeudaMensual.ts:34-43` es una excepción conocida que
 * inlinea esa lógica.
 *
 * R9 (registro en el `Scenes.Stage` de `bot.ts:44-52`) es el otro invariante que
 * previene un bug real, no sólo estilo — pero depende de un archivo DISTINTO al que
 * se está editando, así que sólo puede ser advisory (PostToolUse): un PreToolUse no
 * puede bloquear una escritura por el contenido de un archivo que todavía no reflejó
 * ese cambio.
 *
 * Exit 2 + stderr en el evento Pre para bloquear; exit 0 siempre en el evento Post
 * (additionalContext es lo único que emite ahí).
 */

const fs = require("fs");
const path = require("path");
const {
  resolveRoot,
  readPayload,
  resolveEditedPath,
  writeAdditionalContext,
} = require("./lib/hook-utils.cjs");

const SCENE_EXPORT =
  /export\s+const\s+(\w+)\s*=\s*new\s+Scenes\.WizardScene\s*(<[^>]*>)?\s*\(\s*(["'`])([^"'`]*)\3/;
const LEAVE_SCENE = /(?:(?:async\s+)?function\s+leaveScene\s*\(|const\s+leaveScene\s*=)/;
const HEARS_CANCEL = /\.hears\(\s*\[([^\]]*)\]/g;
const IMPORT_EXTENDED_CONTEXT =
  /import\s*\{[^}]*\bExtendedContext\b[^}]*\}\s*from\s*["'][^"']*config\/context\/myContext["']/;
const IMPORT_GENERAL = /import\s*\{([^}]*)\}\s*from\s*["'][^"']*\/general["']/g;
const COMPOSER_EXTENDED_CONTEXT = /new\s+Composer\s*<\s*ExtendedContext\s*>\s*\(\s*\)/;
const SCENE_LEAVE_CALL = /ctx\.scene\.leave\(\)/;
const WIZARD_NEXT_CALL = /ctx\.wizard\.next\(\)/;
const SELECT_STEP_CALL = /ctx\.wizard\.selectStep\(\s*([^)]*)\)/g;
const ON_MESSAGE = /\.on\(\s*["']message["']/;
const DEFINE_WIZARD_SCENE = /new\s+Scenes\.WizardScene\s*(?:<[^>]*>)?\s*\(/;

/**
 * true si `absPath` (ya resuelto contra la raíz real del repo) cae bajo
 * `functions/src/modules/scenes/`, es `.ts` y no `.d.ts`. Chequea contra la ruta
 * RESUELTA, no contra el `file_path` crudo del payload — ese puede venir relativo
 * (test-gate.sh lo manda así) y un substring anclado con `/` al principio lo dejaría
 * pasar de largo en silencio.
 * @param {string} root raíz real del repo
 * @param {string} absPath ruta real absoluta del archivo editado
 * @return {boolean}
 */
function esArchivoDeScene(root, absPath) {
  if (!absPath.endsWith(".ts") || absPath.endsWith(".d.ts")) return false;
  const rel = path.relative(path.join(root, "functions", "src", "modules", "scenes"), absPath);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Reconstruye el contenido del archivo tal como quedaría después de este tool call.
 * Write: `content` ya es el archivo completo. Edit/MultiEdit: se lee el disco y se
 * aplican los reemplazos en orden — igual semántica que el tool real (primera
 * ocurrencia de `old_string`).
 * @param {string} absPath ruta real absoluta del archivo editado
 * @param {object} toolInput
 * @return {string} "" si no se pudo reconstruir (fail open)
 */
function contenidoMergeado(absPath, toolInput) {
  if (typeof toolInput.content === "string") return toolInput.content;

  let original;
  try {
    original = fs.readFileSync(absPath, "utf8");
  } catch (_) {
    return "";
  }

  const edits = Array.isArray(toolInput.edits)
    ? toolInput.edits
    : [{ old_string: toolInput.old_string, new_string: toolInput.new_string }];

  let content = original;
  for (const edit of edits) {
    const oldString = edit.old_string || "";
    const newString = edit.new_string || "";
    // El reemplazo va como función, no como string: `String.replace` con un string de
    // reemplazo expande los patrones `$$`, `$&`, `` $` ``, `$'` y `$n`. Este árbol tiene
    // 18 `$${monto}` en 4 de las 7 scenes (montos en pesos), y cada uno se colapsaría a
    // `${monto}` — el hook validaría un archivo distinto al que se está por escribir.
    content = oldString === "" ? newString : content.replace(oldString, () => newString);
  }
  return content;
}

/** @param {string} content @return {string[]} */
function findViolations(content) {
  const violations = [];
  const scene = content.match(SCENE_EXPORT);

  if (!scene) {
    violations.push(
      "[R1] No se encontró un export nombrado `export const xWizard = new Scenes.WizardScene(...)` — nunca `export default`"
    );
  } else {
    const [, nombre, generico, , sceneId] = scene;
    if (!sceneId.endsWith("-wizard")) {
      violations.push(`[R2] El id de la scene ("${sceneId}") no termina en \`-wizard\``);
    }
    if (!/wizard/i.test(nombre)) {
      violations.push(`[R8] El nombre exportado (\`${nombre}\`) no contiene la palabra "wizard"`);
    }
    if (generico) {
      violations.push(
        "[R13] `new Scenes.WizardScene(...)` no debe llevar parámetro de tipo genérico — el tipeo llega por `ExtendedContext` en cada step"
      );
    }
  }

  if (!LEAVE_SCENE.test(content)) {
    violations.push("[R3] Falta una función local `leaveScene` (function o const arrow)");
  }

  let hearsCancelOk = false;
  let m;
  HEARS_CANCEL.lastIndex = 0;
  while ((m = HEARS_CANCEL.exec(content)) !== null) {
    if (/salir/i.test(m[1]) && /cancelar/i.test(m[1])) hearsCancelOk = true;
  }
  if (!hearsCancelOk) {
    violations.push(
      '[R4] Falta un `.hears(["salir","Salir","cancelar","Cancelar"], …)` — sin esto el usuario queda encerrado en el wizard'
    );
  }

  if (!IMPORT_EXTENDED_CONTEXT.test(content)) {
    violations.push("[R5] Falta importar `ExtendedContext` desde `config/context/myContext`");
  }

  let importadoGeneral = "";
  IMPORT_GENERAL.lastIndex = 0;
  while ((m = IMPORT_GENERAL.exec(content)) !== null) importadoGeneral += m[1] + " ";
  if (!/\bavanzar\b/.test(importadoGeneral) || !/\bsolicitarIngresoMenu\b/.test(importadoGeneral)) {
    violations.push("[R6] Falta importar `avanzar` y `solicitarIngresoMenu` de `./general`");
  }

  if (!COMPOSER_EXTENDED_CONTEXT.test(content)) {
    violations.push("[R7] Falta `new Composer<ExtendedContext>()` para los pasos del wizard");
  }

  if (!SCENE_LEAVE_CALL.test(content)) {
    violations.push("[R10] Falta al menos una llamada a `ctx.scene.leave()`");
  }

  if (WIZARD_NEXT_CALL.test(content)) {
    violations.push(
      "[R11] Usa `ctx.wizard.next()` directo — avanzar de paso siempre con `avanzar(ctx)`"
    );
  }

  SELECT_STEP_CALL.lastIndex = 0;
  while ((m = SELECT_STEP_CALL.exec(content)) !== null) {
    if (!/^\d+$/.test(m[1].trim())) {
      violations.push(
        `[R12] \`ctx.wizard.selectStep(${m[1].trim()})\` usa un valor calculado — sólo literales numéricos`
      );
    }
  }

  if (!ON_MESSAGE.test(content)) {
    violations.push('[R14] Falta registrar al menos un `.on("message", …)`');
  }

  return violations;
}

/**
 * R9, advisory: la scene exportada tiene que aparecer en el array del
 * `new Scenes.Stage<ExtendedContext>([...])` de `functions/src/bot.ts:44-52`.
 * @param {string} root raíz real del repo
 * @param {string} nombreExportado
 * @return {string | null} mensaje de advertencia, o null si está registrada
 */
function chequearRegistroEnStage(root, nombreExportado) {
  const botPath = path.join(root, "functions", "src", "bot.ts");
  let botContent;
  try {
    botContent = fs.readFileSync(botPath, "utf8");
  } catch (_) {
    return null; // sin bot.ts no hay contra qué comparar
  }

  const stageMatch = botContent.match(/new\s+Scenes\.Stage(?:<[^>]*>)?\s*\(\s*\[([^\]]*)\]/);
  const arrayTexto = stageMatch ? stageMatch[1] : "";
  const registrada = new RegExp(`\\b${nombreExportado}\\b`).test(arrayTexto);

  if (registrada) return null;

  return (
    `La scene \`${nombreExportado}\` no está en el array del \`Scenes.Stage\` de ` +
    "`functions/src/bot.ts` (~línea 44) — sin esto queda muerta sin ningún error de " +
    "compilación ni de runtime (R9, ver .claude/rules/convenciones-codigo.md)."
  );
}

function main() {
  const payload = readPayload();
  if (!/^(Edit|Write|MultiEdit)$/.test(payload.tool_name || "")) return;

  const toolInput = payload.tool_input || {};
  const filePath = toolInput.file_path || "";
  if (!filePath) return;

  const root = resolveRoot(payload.cwd);
  if (!root) return;

  const base = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const absPath = resolveEditedPath(base, filePath);
  if (!esArchivoDeScene(root, absPath)) return;

  const content = contenidoMergeado(absPath, toolInput);
  if (!content || !DEFINE_WIZARD_SCENE.test(content)) return;

  const evento = payload.hook_event_name || "";

  if (evento === "PostToolUse") {
    const scene = content.match(SCENE_EXPORT);
    if (!scene) return;
    const aviso = chequearRegistroEnStage(root, scene[1]);
    if (aviso) writeAdditionalContext("PostToolUse", aviso);
    return;
  }

  // PreToolUse (o cualquier otro evento futuro que reuse este mismo hook): bloqueante.
  const violaciones = findViolations(content);
  if (violaciones.length === 0) return;

  const detalle = violaciones.map((v) => `  ${v}`).join("\n");
  process.stderr.write(
    `\n🚫 [check-scene-wizard] BLOQUEADO: violación de los invariantes de scene en ${path.basename(filePath)}.\n` +
      detalle +
      "\n\nVer .claude/rules/convenciones-codigo.md > Los 14 invariantes de scene.\n\n"
  );
  process.exit(2);
}

try {
  main();
} catch (_) {
  // Fail open.
}
process.exit(0);
