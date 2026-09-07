#!/usr/bin/env node
"use strict";

/**
 * ticket-backfill.cjs — UserPromptSubmit hook (sin matcher de tool)
 *
 * Resuelve los `PENDING-SHA` de la sección Hecho|Done cuando aparece un commit real.
 *
 * Por qué UserPromptSubmit y no PostToolUse: un hook PostToolUse con matcher Bash
 * sólo observa tool calls que ejecuta Claude, y Claude nunca corre `git commit`
 * (hard wall). Ese evento no ocurre jamás dentro de una sesión. UserPromptSubmit
 * no tiene ese problema: dispara en cada mensaje y no le importa cómo ni dónde pasó
 * el commit (terminal, prefijo `!`, un IDE) — sólo compara HEAD contra el marcador.
 *
 * Este hook NUNCA agrega un marcador `pending-since`. Eso lo hacen /commit y
 * /commit-lite. Acá sólo se resuelve uno que ya existe.
 *
 * Es el único lugar de todo el sistema que escribe un SHA real.
 *
 * Corre en cada mensaje, así que tiene que ser barato: una lectura de archivo y dos
 * llamadas a git. Sin red, sin dependencias.
 *
 * Convención completa: ~/.claude/shared/ticket-md.md
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PENDING = /`PENDING-SHA`/g;
const MARKER = /^<!--\s*pending-since:\s*([0-9a-fA-F]{4,40})\s*-->[ \t]*\r?\n?/m;

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

function main() {
  let payload;
  try {
    // El payload de UserPromptSubmit no trae tool_name ni tool_input.
    payload = JSON.parse(readStdin() || "{}");
  } catch (_) {
    return;
  }

  // realpath por la misma razón que en ticket-check.cjs: el cwd del payload puede
  // venir por un symlink y git siempre devuelve la ruta real.
  let base = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    base = fs.realpathSync(base);
  } catch (_) {
    /* se usa tal cual */
  }
  const root = git(base, ["rev-parse", "--show-toplevel"]);
  if (!root) return;

  const ticketPath = path.join(root, "TICKET.md");
  if (!fs.existsSync(ticketPath)) return;

  let text;
  try {
    text = fs.readFileSync(ticketPath, "utf8");
  } catch (_) {
    return;
  }

  // `\b` y no `$`: "## Hecho ✅" tiene que seguir matcheando.
  const head = text.search(/^##\s+(Hecho|Done)\b/m);
  if (head === -1) return;

  const after = text.slice(head + 1);
  const nextIdx = after.search(/^##\s+/m);
  const end = nextIdx === -1 ? text.length : head + 1 + nextIdx;

  let section = text.slice(head, end);

  PENDING.lastIndex = 0;
  if (!PENDING.test(section)) return; // nada pendiente
  PENDING.lastIndex = 0;

  const marker = section.match(MARKER);
  if (!marker) return; // sin marcador no hay contra qué comparar; nunca se crea acá

  const headSha = git(root, ["rev-parse", "--short", "HEAD"]);
  if (!headSha) return;
  if (headSha === marker[1]) return; // todavía no se commiteó nada desde el marcador

  const count = (section.match(PENDING) || []).length;
  section = section.replace(PENDING, "`" + headSha + "`").replace(MARKER, "");

  const next = text.slice(0, head) + section + text.slice(end);
  if (next === text) return;

  try {
    fs.writeFileSync(ticketPath, next);
  } catch (_) {
    return;
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext:
          `TICKET.md: ${count} entrada(s) de Hecho actualizadas con el SHA real \`${headSha}\`.`,
      },
    })
  );
}

try {
  main();
} catch (_) {
  /* nunca bloquear */
}
process.exit(0);
