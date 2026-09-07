#!/usr/bin/env node
"use strict";

/**
 * ticket-check.cjs — PostToolUse hook (matcher: Edit|Write|MultiEdit)
 *
 * Dos triggers, mutuamente excluyentes por invocación:
 *
 *   A. Se editó TICKET.md  → chequeo de tamaño. Si pasa las 150 líneas, sugiere
 *      /ticket-consolidate vía additionalContext. Nunca desmarca nada: editar el
 *      ticket no puede invalidar un checkpoint.
 *
 *   B. Se editó un archivo fuente → desmarca `[x] pr-audit`, porque el veredicto
 *      viejo ya no describe el árbol. La línea se reescribe entera y el veredicto
 *      anterior se cae.
 *
 * NUNCA toca `technician-check` — ese checkpoint sólo lo tilda /technician-check.
 * NUNCA crea TICKET.md ni una sección faltante. Sale con 0 en todos los caminos:
 * PostToolUse no puede bloquear.
 *
 * El backfill de SHA NO vive acá: un matcher Bash sólo observa tool calls que hace
 * Claude, y Claude nunca corre `git commit`. Eso es ticket-backfill.cjs.
 *
 * Convención completa: ~/.claude/shared/ticket-md.md
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const MAX_LINES = 150;

/** Extensiones que cuentan como "fuente" para invalidar pr-audit (stack TS/Node). */
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs", ".json"]);

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch (_) {
    return "";
  }
}

function git(base, args) {
  try {
    return execFileSync("git", ["-C", base, ...args], {
      encoding: "utf8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (_) {
    return null;
  }
}

/**
 * `git rev-parse --show-toplevel` devuelve siempre la ruta real, mientras que el
 * `cwd` del payload puede venir por un symlink (en macOS /tmp y /var lo son, y un
 * directorio de proyecto symlinkeado es igual de común). Sin normalizar, el
 * path.relative() de abajo da ".." y el hook se apaga en silencio.
 * @param {string} p ruta a normalizar
 * @return {string} la ruta real si existe, la original si no
 */
function real(p) {
  try {
    return fs.realpathSync(p);
  } catch (_) {
    return p;
  }
}

/**
 * Prosa, config de Claude, lockfiles y dependencias no invalidan un audit.
 * @param {string} relPath ruta relativa a la raíz del repo
 * @return {boolean}
 */
function isSourceFile(relPath) {
  if (!relPath) return false;
  const p = relPath.split(path.sep).join("/");
  if (p.startsWith(".claude/") || p.includes("/.claude/")) return false;
  if (/(^|\/)node_modules\//.test(p)) return false;
  if (/(^|\/)lib\//.test(p)) return false;
  if (/(^|\/)docs\//.test(p)) return false;
  if (/(^|\/)(package-lock|npm-shrinkwrap)\.json$/.test(p)) return false;
  return SOURCE_EXTENSIONS.has(path.extname(p).toLowerCase());
}

/** Trigger A — sólo avisa, nunca modifica el archivo. */
function sizeCheck(ticketPath) {
  let lines;
  try {
    lines = fs.readFileSync(ticketPath, "utf8").split("\n").length;
  } catch (_) {
    return;
  }
  if (lines <= MAX_LINES) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `TICKET.md tiene ${lines} líneas (límite ${MAX_LINES}). ` +
          "Considerá correr /ticket-consolidate. Esto es una sugerencia, no debe " +
          "descarrilar la tarea en curso.",
      },
    })
  );
}

/** Trigger B — desmarca pr-audit si está tildado. */
function uncheckPrAudit(ticketPath) {
  let text;
  try {
    text = fs.readFileSync(ticketPath, "utf8");
  } catch (_) {
    return;
  }

  // `\b` y no `$`: "## Checkpoints ✅" tiene que seguir matcheando.
  const head = text.search(/^##\s+Checkpoints\b/m);
  if (head === -1) return; // sección ausente → salida silenciosa, nunca se crea

  const after = text.slice(head + 1);
  const nextIdx = after.search(/^##\s+/m);
  const end = nextIdx === -1 ? text.length : head + 1 + nextIdx;

  const section = text.slice(head, end);
  if (!/^-\s+\[x\]\s+pr-audit\b/im.test(section)) return; // ya desmarcado → no-op

  const today = new Date().toISOString().slice(0, 10);
  const updated = section.replace(/^-\s+\[x\]\s+pr-audit\b.*$/im, `- [ ] pr-audit — ${today}`);
  if (updated === section) return;

  const next = text.slice(0, head) + updated + text.slice(end);
  if (next === text) return; // sin cambio real → no se escribe (evita churn de mtime)

  try {
    fs.writeFileSync(ticketPath, next);
  } catch (_) {
    /* no-op */
  }
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch (_) {
    return;
  }

  if (!/^(Edit|Write|MultiEdit)$/.test(payload.tool_name || "")) return;

  // Nunca path.resolve(__dirname, …): desde un worktree eso apunta a otro repo.
  const base = real(payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const root = git(base, ["rev-parse", "--show-toplevel"]);
  if (!root) return;

  const ticketPath = path.join(root, "TICKET.md");
  if (!fs.existsSync(ticketPath)) return; // sin ticket no hay nada que hacer

  const filePath = (payload.tool_input && payload.tool_input.file_path) || "";
  if (!filePath) return;

  const edited = real(path.resolve(base, filePath));

  if (edited === ticketPath) {
    sizeCheck(ticketPath); // A corta acá: editar el ticket nunca desmarca
    return;
  }

  const rel = path.relative(root, edited);
  if (rel.startsWith("..")) return; // fuera del repo
  if (!isSourceFile(rel)) return;

  uncheckPrAudit(ticketPath);
}

try {
  main();
} catch (_) {
  /* nunca bloquear */
}
process.exit(0);
