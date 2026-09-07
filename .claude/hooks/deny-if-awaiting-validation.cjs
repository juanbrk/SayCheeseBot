#!/usr/bin/env node
"use strict";

/**
 * deny-if-awaiting-validation.cjs — PreToolUse hook
 *   matcher: Edit|Write|MultiEdit|Bash
 *
 * Segunda pieza del gate de validación. Si existe `.claude/.awaiting-validation.json`
 * (lo escribe gate-on-task-complete.cjs al marcar una tarea como completa), rechaza
 * la herramienta con exit 2. Ese es el código que PreToolUse interpreta como "no
 * ejecutes esto", y el texto de stderr vuelve a Claude como feedback.
 *
 * Efecto práctico: una tarea completada corta el turno. Claude no puede seguir
 * encadenando pasos; tiene que presentar el resultado y esperar a Juan. El gate se
 * borra solo en el próximo mensaje (clear-validation-gate.cjs).
 *
 * TTL de 3 horas: si el archivo quedó huérfano (sesión que murió sin un mensaje
 * siguiente), expira solo en vez de dejar el repo en modo sólo-lectura para siempre.
 *
 * ── Diferencia con el original de estudio-lata-frontend ──
 * Allá el matcher es sólo `Edit|Write|MultiEdit`. Acá se agrega `Bash`, porque un
 * `sed -i`, un heredoc o un `>` escriben archivos igual que Write y dejarían el gate
 * en puro adorno. Los comandos Bash de sólo lectura (git status, tsc, grep, npm run
 * build) pasan sin problema: sólo se frenan los que tienen firma de escritura, y las
 * redirecciones a /dev/null, /tmp y al scratchpad se ignoran a propósito.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const GATE_FILE = ".awaiting-validation.json";

/** Únicas herramientas que el gate frena (además de un Bash que escriba). */
const TOOLS_DE_ESCRITURA = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const TTL_MS = 3 * 60 * 60 * 1000;

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch (_) {
    return "";
  }
}

function real(p) {
  try {
    return fs.realpathSync(p);
  } catch (_) {
    return p;
  }
}

function resolveRoot(payload) {
  const base = real(payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  try {
    const top = execFileSync("git", ["-C", base, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return top ? real(top) : null;
  } catch (_) {
    return null;
  }
}

/** Rutas que no cuentan como "escribir en el proyecto". */
const RUTA_EFIMERA = /(\/dev\/(null|stderr|stdout)|(^|\s)\/tmp\/|(^|\s)\/private\/tmp\/|scratchpad)/;

/**
 * ¿Este comando de Bash escribe archivos?
 *
 * Se busca firma de escritura, no se intenta parsear shell — un parser de verdad
 * sería frágil y este hook falla abierto igual. Falsos positivos posibles; el costo
 * es un mensaje explicando que hay que esperar, no perder trabajo.
 *
 * @param {string} cmd el comando
 * @return {boolean}
 */
function bashEscribe(cmd) {
  if (!cmd) return false;
  const c = String(cmd);

  // Edición in-place y copias/movidas/borrados.
  if (/\bsed\s+-[a-zA-Z]*i\b/.test(c)) return true;
  if (/\bperl\s+-[a-zA-Z]*i\b/.test(c)) return true;
  if (/\b(mv|cp|rm|rmdir|truncate|install|patch|touch)\s/.test(c)) return true;
  if (/\bgit\s+(checkout|restore|reset|apply|revert|stash)\b/.test(c)) return true;
  if (/\btee\b/.test(c)) return true;

  // Redirecciones. Se ignoran las que van a destinos efímeros o a un descriptor
  // (2>&1 y compañía), que son ruido de verificación, no escritura de proyecto.
  const redirecciones = c.match(/>>?\s*[^\s|&;)]+/g) || [];
  for (const r of redirecciones) {
    if (/^>&|^>>?\s*&/.test(r)) continue;
    if (RUTA_EFIMERA.test(r)) continue;
    return true;
  }
  return false;
}

function bloquear(motivo) {
  process.stderr.write(
    "\n🚦 BLOQUEADO: hay una tarea recién marcada como completa — el gate de validación está activo.\n" +
      `(${motivo})\n` +
      "Pará acá. Presentá qué se hizo y cómo validarlo, y esperá el próximo mensaje de Juan.\n" +
      "El gate se libera solo con ese mensaje — no intentes esquivarlo ni borrar el archivo.\n\n"
  );
  process.exit(2);
}

try {
  const payload = JSON.parse(readStdin() || "{}");
  const root = resolveRoot(payload);
  if (!root) process.exit(0);

  const gatePath = path.join(root, ".claude", GATE_FILE);
  if (!fs.existsSync(gatePath)) process.exit(0);

  let gate;
  try {
    gate = JSON.parse(fs.readFileSync(gatePath, "utf8"));
  } catch (_) {
    gate = {};
  }

  if (Date.now() - (gate.completedAt || 0) > TTL_MS) {
    try {
      fs.unlinkSync(gatePath);
    } catch (_) {
      /* ya no está */
    }
    process.exit(0);
  }

  const tool = payload.tool_name || "";

  if (tool === "Bash") {
    if (bashEscribe((payload.tool_input || {}).command)) {
      bloquear("comando Bash con firma de escritura");
    }
    process.exit(0); // Bash de sólo lectura: se deja pasar
  }

  // Lista blanca explícita en vez de "bloqueá todo lo que no sea Bash": si mañana el
  // matcher de settings.json se amplía, o aparece un tool nuevo, el default es dejar
  // pasar. Un gate que frena de más es tan inútil como uno que no frena.
  if (TOOLS_DE_ESCRITURA.has(tool)) bloquear(`herramienta ${tool}`);
} catch (_) {
  // Fail open.
}

process.exit(0);
