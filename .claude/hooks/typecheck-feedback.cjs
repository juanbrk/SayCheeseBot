#!/usr/bin/env node
"use strict";

/**
 * typecheck-feedback.cjs — PostToolUse hook (matcher: Edit|Write|MultiEdit)
 *
 * Corre `tsc --noEmit --incremental` desde functions/ cuando se edita un .ts que entra
 * al grafo de compilación, y devuelve los errores como additionalContext en el mismo
 * turno — sin esto, romper el build no se nota hasta correr `npm run build` a mano.
 *
 * Portado de kakebot-backend con tres arreglos, no copiado tal cual:
 *
 *   1. `timeout: 15000` de origen abortaba siempre: acá `tsc --noEmit` tarda ~12s en
 *      frío. Con SIGTERM, spawnSync devuelve status:null y la rama de reporte exige
 *      `status !== 0 && output.trim()` — el hook no imprimía nada y salía 0: parecía
 *      funcionar y no chequeaba nada. Acá el timeout es 60000 y además se corre con
 *      `--incremental`, que en tibio baja a ~1.3s (medido, 9 corridas).
 *   2. El gate de ruta de origen exigía "/functions/src/". Acá NO alcanza:
 *      `functions/config/context/myContext.ts` vive fuera de `src/` y sin embargo entra
 *      al grafo porque `bot.ts:2` lo importa — tsconfig.json sólo lista "src" en
 *      `include`, pero el compilador arrastra cualquier archivo importado
 *      transitivamente sin importar dónde esté. El gate es "está bajo functions/, es
 *      .ts, no es .d.ts, no es build output ni dependencia".
 *   3. Feedback por `additionalContext` (stdout), nunca por stderr como el original.
 *      Y silencio en verde: kakebot imprime "✅ Sin errores" en cada edición limpia,
 *      que es ruido puro en un hook que corre en cada Write/Edit.
 *
 * Suma un lockfile con PID (fuera del repo, en os.tmpdir()) que este hook no tenía en
 * kakebot: si Claude dispara varios Edit en paralelo, cada uno lanza su propio proceso
 * `tsc` — sin el lock, 5 Edits seguidos encolarían 5 corridas cuyos primeros 4
 * resultados llegan obsoletos para cuando terminan. Con el lock, si ya hay una corrida
 * viva, esta invocación sale en silencio: la corrida en curso va a reportar sobre un
 * árbol que ya incluye este último cambio (o la siguiente invocación lo hará).
 *
 * `--noEmit` es obligatorio: sin él el hook emitiría a functions/lib/ y competiría con
 * el `tsc -w` que `scripts/go.sh` ya corre en paralelo durante desarrollo.
 *
 * Exit 0 siempre — PostToolUse no puede bloquear.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  resolveRoot,
  readPayload,
  resolveEditedPath,
  writeAdditionalContext,
} = require("./lib/hook-utils.cjs");

const TIMEOUT_MS = 60000;
const MAX_LINES = 25;
const LOCK_PATH = path.join(os.tmpdir(), "saycheesebot-typecheck.lock");
const TSBUILDINFO_PATH = path.join(os.tmpdir(), "saycheesebot-tsc.tsbuildinfo");

/**
 * `functions/` sin restringirse a `src/`: ver el arreglo 2 del encabezado.
 * @param {string} root raíz real del repo
 * @param {string} edited ruta real absoluta del archivo editado
 * @return {boolean}
 */
function isCheckableFile(root, edited) {
  if (!edited.endsWith(".ts") || edited.endsWith(".d.ts")) return false;
  const rel = path.relative(path.join(root, "functions"), edited);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const segments = rel.split(path.sep);
  if (segments[0] === "lib" || segments[0] === "node_modules") return false;
  return true;
}

/**
 * true si hay una corrida de tsc de este hook todavía viva.
 * @return {boolean}
 */
function otraCorridaEnCurso() {
  let pid;
  try {
    pid = parseInt(fs.readFileSync(LOCK_PATH, "utf8"), 10);
  } catch (_) {
    return false;
  }
  if (!pid) return false;
  try {
    process.kill(pid, 0); // no mata nada: sólo prueba si el proceso existe
    return true;
  } catch (_) {
    return false; // ESRCH: el proceso dueño del lock ya no vive — lock huérfano
  }
}

function main() {
  const payload = readPayload();
  if (!/^(Edit|Write|MultiEdit)$/.test(payload.tool_name || "")) return;

  const root = resolveRoot(payload.cwd);
  if (!root) return;

  const filePath = (payload.tool_input && payload.tool_input.file_path) || "";
  if (!filePath) return;

  const base = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const edited = resolveEditedPath(base, filePath);
  if (!isCheckableFile(root, edited)) return;

  const functionsDir = path.join(root, "functions");
  const tscBin = path.join(functionsDir, "node_modules", ".bin", "tsc");
  if (!fs.existsSync(tscBin)) return; // sin build de deps no hay con qué chequear

  if (otraCorridaEnCurso()) return;

  try {
    fs.writeFileSync(LOCK_PATH, String(process.pid));

    const result = spawnSync(
      tscBin,
      ["--noEmit", "--incremental", "--tsBuildInfoFile", TSBUILDINFO_PATH],
      { cwd: functionsDir, encoding: "utf8", timeout: TIMEOUT_MS }
    );

    const output = (result.stdout || "") + (result.stderr || "");
    if (result.status !== 0 && output.trim()) {
      const lines = output.trim().split("\n");
      const preview = lines.slice(0, MAX_LINES).join("\n");
      const truncated =
        lines.length > MAX_LINES ? `\n... (${lines.length - MAX_LINES} líneas más)` : "";
      writeAdditionalContext(
        "PostToolUse",
        `tsc encontró errores en ${path.relative(root, edited)}:\n\n${preview}${truncated}`
      );
    }
    // status === 0 → silencio: no hay nada que agregar al contexto.
  } finally {
    try {
      fs.unlinkSync(LOCK_PATH);
    } catch (_) {
      /* no-op */
    }
  }
}

try {
  main();
} catch (_) {
  /* nunca bloquear */
}
process.exit(0);
