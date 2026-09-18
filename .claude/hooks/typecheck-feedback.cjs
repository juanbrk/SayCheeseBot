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
 * Tanto el lock como el `--tsBuildInfoFile` llevan un hash de la raíz resuelta en el
 * nombre. Con un nombre fijo los comparten TODOS los worktrees del repo (hoy hay 2), y
 * eso rompe las dos premisas de arriba: el lock de un worktree apaga en silencio el
 * chequeo del otro — donde la corrida en vuelo NO va a reportar sobre este árbol, porque
 * es otro árbol — y el buildinfo compartido se pisa al alternar, perdiendo el warm de
 * ~1.3s que justifica correr tsc en cada edición.
 *
 * `--noEmit` es obligatorio: sin él el hook emitiría a functions/lib/ y competiría con
 * el `tsc -w` que `scripts/go.sh` ya corre en paralelo durante desarrollo.
 *
 * Exit 0 siempre — PostToolUse no puede bloquear.
 */

const crypto = require("crypto");
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

/**
 * Hash corto de la raíz del worktree, para que dos worktrees del mismo repo no compartan
 * ni lock ni buildinfo. La raíz ya viene normalizada por `resolveRoot` (realpath), así
 * que dos invocaciones sobre el mismo worktree dan siempre el mismo hash.
 * @param {string} root raíz real del repo
 * @return {string} 8 hex chars
 */
function hashDeRaiz(root) {
  return crypto.createHash("sha1").update(root).digest("hex").slice(0, 8);
}

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
 * true si hay una corrida de tsc de este hook todavía viva **sobre este worktree**.
 * @param {string} lockPath ruta del lock de este worktree
 * @return {boolean}
 */
function otraCorridaEnCurso(lockPath) {
  let pid;
  try {
    pid = parseInt(fs.readFileSync(lockPath, "utf8"), 10);
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

  const sufijo = hashDeRaiz(root);
  const lockPath = path.join(os.tmpdir(), `saycheesebot-typecheck-${sufijo}.lock`);
  const tsBuildInfoPath = path.join(os.tmpdir(), `saycheesebot-tsc-${sufijo}.tsbuildinfo`);

  if (otraCorridaEnCurso(lockPath)) return;

  try {
    fs.writeFileSync(lockPath, String(process.pid));

    const result = spawnSync(
      tscBin,
      ["--noEmit", "--incremental", "--tsBuildInfoFile", tsBuildInfoPath],
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
      fs.unlinkSync(lockPath);
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
