#!/usr/bin/env node
"use strict";

/**
 * clear-validation-gate.cjs — UserPromptSubmit hook (sin matcher de tool)
 *
 * Tercera y última pieza del gate. Borra `.claude/.awaiting-validation.json`.
 *
 * Que viva en UserPromptSubmit es todo el diseño: el gate se libera con el próximo
 * mensaje de Juan y con nada más. Claude no tiene forma de destrabarse solo —
 * cualquier intento de borrar el archivo pasa por Bash o Write, y el hook de deny
 * los frena a los dos. La única llave es que Juan hable.
 *
 * Corre en cada mensaje: una llamada a git y un unlink, sin red y sin dependencias.
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
  const root = resolveRoot(payload);
  if (root) {
    const gatePath = path.join(root, ".claude", GATE_FILE);
    if (fs.existsSync(gatePath)) fs.unlinkSync(gatePath);
  }
} catch (_) {
  // Fail open.
}

process.exit(0);
