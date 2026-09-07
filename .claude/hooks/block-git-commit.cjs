#!/usr/bin/env node
"use strict";

/**
 * block-git-commit.cjs — PreToolUse hook (matcher: Bash)
 *
 * Claude nunca corre `git commit`. Hasta ahora eso era sólo una convención escrita
 * en CLAUDE.md; acá pasa a estar mecánicamente impuesto, igual que en
 * estudio-lata-frontend.
 *
 * Es lo que le da sentido al contrato PENDING-SHA: si Claude pudiera commitear, no
 * haría falta el marcador `pending-since` ni el hook de backfill. Y es la otra mitad
 * del gate de iteración — Juan commitea a mano, y ese acto es el punto de control
 * real entre una iteración y la siguiente.
 *
 * `git commit --dry-run` también se frena: no cambia nada, pero tampoco hace falta.
 */

const fs = require("fs");

try {
  const payload = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const command = String((payload.tool_input || {}).command || "");

  if (/\bgit\b[^;&|]*?\scommit(\s|$)/.test(command)) {
    process.stderr.write(
      "\n🚫 BLOQUEADO: Claude no corre `git commit` en este repo.\n" +
        "Juan commitea a mano. Preparale el mensaje con /commit y dejá la entrada de\n" +
        "TICKET.md con el literal `PENDING-SHA` — ticket-backfill.cjs le pone el SHA real\n" +
        "solo, en el próximo mensaje después del commit.\n\n"
    );
    process.exit(2);
  }
} catch (_) {
  // Fail open.
}

process.exit(0);
