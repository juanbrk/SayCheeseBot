#!/usr/bin/env bash
set -euo pipefail

# go.sh — un solo modo de desarrollo (Fase E en TICKET.md): emulador (functions +
# firestore) + `tsc -w` + el bot en polling contra @botito_testitoBot.
#
# FIRESTORE_EMULATOR_HOST y GCLOUD_PROJECT se exportan acá a mano porque sólo llegan solos
# al proceso de `functions` que el propio emulador levanta y gestiona. `dev.ts` corre aparte,
# como proceso standalone (`node --watch`) — sin FIRESTORE_EMULATOR_HOST la guarda E5b lo
# aborta siempre; sin GCLOUD_PROJECT, `initializeApp()` (en `firebase.ts`, sin projectId
# explícito) resuelve OTRO proyecto contra el emulador — mismo emulador, namespace distinto —
# y las queries del bot devuelven vacío en silencio aunque `doctor.cjs seed` sí haya escrito
# datos (ese seed pasa `projectId` a mano y por eso nunca se veía afectado).

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

# firebase-admin@14 (y por lo tanto dev.ts) y firebase-tools exigen Node >=22.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null
fi

NODE_MAYOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAYOR" -lt 22 ]; then
  echo "✗ Node $(node -v): hace falta >=22 (firebase-admin@14). Corré: nvm use 22" >&2
  exit 1
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "✗ No se encontró el binario \`firebase\` bajo Node $(node -v)." >&2
  echo "  Instalalo con ese Node activo: npm install -g firebase-tools" >&2
  exit 1
fi

if [ ! -f functions/.env.local ]; then
  echo "✗ Falta functions/.env.local (TELEGRAM_TOKEN + TELEGRAM_TOKEN_TEST). Ver E2b en TICKET.md." >&2
  exit 1
fi

export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
export GCLOUD_PROJECT="my-first-bot-da27e"

echo "→ Build inicial (para que \`node --watch\` tenga algo que correr desde el arranque)…"
npm --prefix functions run build

# El emulador de Firestore no persiste nada entre arranques (E7b): cada `go` parte de una
# base vacía. Por eso el seed va acá adentro, como un cuarto proceso — uno que espera a que
# el puerto 8080 esté escuchando y corre una sola vez. Con `--kill-others-on-fail` (en vez de
# `--kill-others`) que termine en 0 no tira abajo al resto; si `doctor.cjs seed` falla, sí.
CONCURRENTLY="$RAIZ/functions/node_modules/.bin/concurrently"
exec "$CONCURRENTLY" \
  --names "emu,tsc,bot,seed" \
  --prefix-colors "yellow,cyan,magenta,green" \
  --kill-others-on-fail \
  "firebase emulators:start --only functions,firestore" \
  "npm --prefix functions run build:watch" \
  "node --watch functions/lib/src/dev.js" \
  "bash -c 'until nc -z 127.0.0.1 8080 2>/dev/null; do sleep 0.5; done; node functions/scripts/doctor.cjs seed'"
