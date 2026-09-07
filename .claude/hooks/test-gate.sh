#!/usr/bin/env bash
# test-gate.sh — verificación del gate de validación (los 3 hooks + block-git-commit).
#
# Corre TODO contra un repo git descartable en $TMPDIR: nunca toca este repo ni su
# TICKET.md. Se puede correr cuantas veces se quiera.
#
#   bash .claude/hooks/test-gate.sh
#
# Salida esperada: "RESULTADO: 21 pasaron, 0 fallaron" y exit 0.

set -u
HOOKS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

S=$(mktemp -d)
OUT=$(mktemp -d)
trap 'rm -rf "$S" "$OUT"' EXIT

git -C "$S" init -q
git -C "$S" config user.email t@t.com
git -C "$S" config user.name t
mkdir -p "$S/.claude"
echo "x" > "$S/a.js"
git -C "$S" add -A
git -C "$S" commit -qm one

GATE="$S/.claude/.awaiting-validation.json"
pass=0
fail=0

chk() { # chk <etiqueta> <obtenido> <esperado>
  if [ "$2" = "$3" ]; then
    echo "  ✓ $1"
    pass=$((pass + 1))
  else
    echo "  ✗ $1  (esperado=$3 obtenido=$2)"
    fail=$((fail + 1))
  fi
}

run() { # run <json> <hook> → imprime el exit code
  printf '%s' "$1" | node "$HOOKS/$2" >/dev/null 2>&1
  printf '%s' "$?"
}

estado_gate() {
  if [ -f "$GATE" ]; then printf 'presente'; else printf 'ausente'; fi
}

edit_en() { printf '{"tool_name":"Edit","cwd":"%s","tool_input":{"file_path":"a.js"}}' "$1"; }
bash_en() { printf '{"tool_name":"Bash","cwd":"%s","tool_input":{"command":"%s"}}' "$S" "$1"; }
task_en() { printf '{"tool_name":"TaskUpdate","cwd":"%s","tool_input":{"taskId":"9","status":"%s"}}' "$S" "$1"; }

echo "── 1. gate-on-task-complete (arma el gate) ──"
rm -f "$GATE"
run "$(task_en in_progress)" gate-on-task-complete.cjs >/dev/null
chk "status=in_progress NO arma el gate" "$(estado_gate)" ausente
run "$(task_en completed)" gate-on-task-complete.cjs >/dev/null
chk "status=completed SÍ arma el gate" "$(estado_gate)" presente
if node -e "const g=require('$GATE'); process.exit(g.taskId==='9' && g.completedAt>0 ? 0 : 1)"; then
  chk "el centinela guarda taskId + completedAt" ok ok
else
  chk "el centinela guarda taskId + completedAt" mal ok
fi

echo "── 2. deny-if-awaiting-validation (gate ACTIVO) ──"
chk "Edit                  → bloqueado" "$(run "$(edit_en "$S")" deny-if-awaiting-validation.cjs)" 2
chk "Write                 → bloqueado" "$(run "$(printf '{"tool_name":"Write","cwd":"%s","tool_input":{"file_path":"a.js"}}' "$S")" deny-if-awaiting-validation.cjs)" 2
chk "Bash: sed -i          → bloqueado" "$(run "$(bash_en "sed -i '' s/a/b/ a.js")" deny-if-awaiting-validation.cjs)" 2
chk "Bash: heredoc > file  → bloqueado" "$(run "$(bash_en 'cat > a.js')" deny-if-awaiting-validation.cjs)" 2
chk "Bash: mv              → bloqueado" "$(run "$(bash_en 'mv a.js b.js')" deny-if-awaiting-validation.cjs)" 2
chk "Bash: git status      → permitido" "$(run "$(bash_en 'git status')" deny-if-awaiting-validation.cjs)" 0
chk "Bash: tsc 2>&1 | head → permitido" "$(run "$(bash_en 'npx tsc --noEmit 2>&1 | head -20')" deny-if-awaiting-validation.cjs)" 0
chk "Bash: > /dev/null     → permitido" "$(run "$(bash_en 'grep -r foo src > /dev/null')" deny-if-awaiting-validation.cjs)" 0
chk "Read                  → permitido" "$(run "$(printf '{"tool_name":"Read","cwd":"%s","tool_input":{"file_path":"a.js"}}' "$S")" deny-if-awaiting-validation.cjs)" 0

echo "── 3. clear-validation-gate (libera con el mensaje del usuario) ──"
run "$(printf '{"hook_event_name":"UserPromptSubmit","cwd":"%s"}' "$S")" clear-validation-gate.cjs >/dev/null
chk "el mensaje del usuario libera el gate" "$(estado_gate)" ausente
chk "Edit después de liberar → permitido" "$(run "$(edit_en "$S")" deny-if-awaiting-validation.cjs)" 0

echo "── 4. TTL de 3 horas (gate huérfano) ──"
node -e "require('fs').writeFileSync('$GATE', JSON.stringify({taskId:'9', completedAt: Date.now() - 4*3600*1000}))"
salida_ttl=$(run "$(edit_en "$S")" deny-if-awaiting-validation.cjs)
estado_ttl=$(estado_gate)
chk "gate vencido → permitido" "$salida_ttl" 0
chk "gate vencido se auto-borra" "$estado_ttl" ausente

echo "── 5. block-git-commit ──"
chk "git commit -m         → bloqueado" "$(run "$(bash_en "git commit -m x")" block-git-commit.cjs)" 2
chk "git -C . commit       → bloqueado" "$(run "$(bash_en 'git -C . commit -m x')" block-git-commit.cjs)" 2
chk "git status            → permitido" "$(run "$(bash_en 'git status')" block-git-commit.cjs)" 0
chk "git log               → permitido" "$(run "$(bash_en 'git log --oneline')" block-git-commit.cjs)" 0

echo "── 6. degradación (nunca frenar por accidente) ──"
chk "fuera de un repo git  → permitido" "$(run "$(edit_en "$OUT")" deny-if-awaiting-validation.cjs)" 0
chk "stdin que no es JSON  → permitido" "$(run 'no-soy-json' deny-if-awaiting-validation.cjs)" 0

echo ""
echo "RESULTADO: $pass pasaron, $fail fallaron"
[ "$fail" -eq 0 ]
