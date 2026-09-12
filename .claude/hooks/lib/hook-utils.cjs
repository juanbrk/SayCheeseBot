"use strict";

/**
 * hook-utils.cjs — helpers compartidos por los hooks de código (typecheck-feedback,
 * env-change-guard, protect-sensitive-files, check-list-bullets, check-firmas,
 * check-scene-wizard). Los 6 hooks de proceso (ticket-*, gate-*, block-git-commit) NO
 * usan este módulo: ya están cubiertos por los 22 asserts de test-gate.sh y
 * refactorearlos es churn sin beneficio.
 *
 * Vive en lib/ y no plano en hooks/ para que un glob futuro (`for f in
 * .claude/hooks/*.cjs`) no lo invoque como si fuera un hook.
 *
 * El `require("./lib/hook-utils.cjs")` de cada hook es __dirname-relativo y esto SÍ
 * está bien: __dirname sirve para ubicar un archivo hermano del que se está
 * ejecutando. Lo que nunca hay que hacer es derivar de __dirname la raíz del REPO que
 * se inspecciona — ahí __dirname respondería una pregunta distinta (dónde vive el
 * hook, no sobre qué árbol se lo invocó) y dejaría de coincidir con symlinks o con más
 * de un worktree. Para eso está resolveRoot().
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

/**
 * `git rev-parse --show-toplevel` devuelve siempre la ruta real, mientras que el `cwd`
 * del payload puede venir por un symlink (en macOS /tmp y /var lo son). Sin normalizar,
 * un path.relative() posterior da ".." y el hook se apaga en silencio.
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
 * Corre git contra una base dada, sin shell. Nunca tira: devuelve null si el comando
 * falla, si git no está en el PATH, o si tarda más de 3s.
 * @param {string} base cwd para el comando
 * @param {string[]} args argv de git
 * @return {string | null}
 */
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
 * Resuelve la raíz del worktree: payload.cwd -> $CLAUDE_PROJECT_DIR -> process.cwd(),
 * y desde ahí `git rev-parse --show-toplevel`. Nunca derivada de __dirname.
 * @param {string} [payloadCwd] campo `cwd` del payload del hook, si vino
 * @return {string | null} raíz real del repo, o null si no se pudo resolver
 */
function resolveRoot(payloadCwd) {
  const base = real(payloadCwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const root = git(base, ["rev-parse", "--show-toplevel"]);
  return root ? real(root) : null;
}

/**
 * Lee y parsea el payload JSON que Claude Code manda por stdin. Nunca tira: devuelve
 * `{}` si stdin está vacío o no es JSON válido.
 * @return {object}
 */
function readPayload() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw || "{}");
  } catch (_) {
    return {};
  }
}

/**
 * Resuelve la ruta absoluta y real de un `file_path` de payload, que puede venir
 * relativo (test-gate.sh lo manda así) o absoluto.
 * @param {string} base directorio base para resolver rutas relativas (el cwd del payload)
 * @param {string} filePath valor de `tool_input.file_path`
 * @return {string} ruta absoluta real
 */
function resolveEditedPath(base, filePath) {
  return real(path.resolve(base, filePath));
}

/**
 * Emite el contrato de salida de un hook `PostToolUse` con feedback: un único JSON en
 * stdout, nunca stderr ni texto suelto. `additionalContext` es lo único que Claude ve.
 * @param {string} hookEventName siempre "PostToolUse" en los hooks que usan esto hoy
 * @param {string} additionalContext texto que se agrega al contexto de la conversación
 */
function writeAdditionalContext(hookEventName, additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName, additionalContext },
    })
  );
}

module.exports = {
  real,
  git,
  resolveRoot,
  readPayload,
  resolveEditedPath,
  writeAdditionalContext,
};
