#!/usr/bin/env node
"use strict";

/**
 * gate-on-task-complete.cjs — PostToolUse hook (matcher: TaskUpdate)
 *
 * Primera pieza de las tres que forman el "gate de validación": el mecanismo que
 * impide que Claude resuelva un ticket entero de un saque, sin que Juan valide
 * nada en el medio.
 *
 * Cuando una tarea se marca `completed` vía TaskUpdate, este hook escribe el
 * archivo centinela `.claude/.awaiting-validation.json`. A partir de ahí:
 *
 *   - deny-if-awaiting-validation.cjs (PreToolUse) rechaza toda edición
 *   - clear-validation-gate.cjs (UserPromptSubmit) lo borra en el próximo mensaje
 *
 * O sea: marcar una tarea como completa es el ÚLTIMO acto de un turno. Todas las
 * ediciones y verificaciones del paso van antes; después sólo queda presentar el
 * resultado y esperar.
 *
 * Portado de estudio-lata-frontend, con una diferencia: allá la raíz se resolvía
 * con `__dirname/../..`, que en un worktree apunta al repo equivocado. Acá se
 * resuelve como en los otros hooks del repo: payload.cwd → git rev-parse.
 *
 * Sale con 0 siempre: PostToolUse no puede bloquear, y un gate que rompe el turno
 * en el que se arma no sirve de nada.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const GATE_FILE = ".awaiting-validation.json";

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

/**
 * Raíz del worktree. Nunca __dirname: en un worktree eso apunta a otro repo.
 * @param {object} payload el JSON que llega por stdin
 * @return {string|null} la raíz, o null si no hay repo
 */
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

try {
  const payload = JSON.parse(readStdin() || "{}");
  const input = payload.tool_input || {};
  const response = payload.tool_response || {};

  // El status puede venir en lo que Claude mandó (tool_input) o en lo que el tool
  // devolvió (tool_response). Se miran los dos: distintas versiones del harness
  // lo reportan distinto, y perderse el evento apaga el gate en silencio.
  const status = input.status || response.status;
  if (status !== "completed") process.exit(0);

  const root = resolveRoot(payload);
  if (!root) process.exit(0);

  const claudeDir = path.join(root, ".claude");
  if (!fs.existsSync(claudeDir)) process.exit(0);

  const taskId = input.taskId || input.id || input.task_id || response.taskId || null;
  fs.writeFileSync(
    path.join(claudeDir, GATE_FILE),
    JSON.stringify({ taskId, completedAt: Date.now() }) + "\n"
  );

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          "🚦 Gate de validación ACTIVO (tarea marcada como completa). No edites nada más: " +
          "presentá qué se hizo y cómo probarlo, y esperá el próximo mensaje de Juan. " +
          "El gate se libera solo con ese mensaje.",
      },
    })
  );
} catch (_) {
  // Fail open: un gate roto nunca debe frenar el trabajo.
}

process.exit(0);
