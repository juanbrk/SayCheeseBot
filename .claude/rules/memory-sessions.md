# Session Log

## 2026-09-18: GitHub Action para deploy automático de Cloud Functions

### Completado
- Creado `.github/workflows/deploy-functions.yml` adaptado de kakebot: trigger `master`, WIF auth, 2 env vars (`TELEGRAM_TOKEN`, `TELEGRAM_ALLOWED_IDS`), sin `setWebhook` ni `NODE_ENV`
- Fix del primer deploy fallido: `google-github-actions/auth@v2` → `@v3` (Node 24 nativo) + `--non-interactive` en el deploy
- Fix del segundo deploy fallido: `firebase-tools` sin pin traía v15.22.2 (regresión que ignora credenciales WIF); pinado a `>=15.23.0`

### Pendiente
- Verificar que el deploy pase en verde con el pin de firebase-tools

## 2026-09-10 – 2026-09-18: Portar hooks de feedback de código desde kakebot-backend — completo

### Completado
- Portados 6 hooks de código desde kakebot (`typecheck-feedback`, `env-change-guard`, `protect-sensitive-files`, `check-list-bullets`, `check-firmas`, `check-scene-wizard`) como `.cjs` con helpers compartidos en `lib/hook-utils.cjs` y `lib/params-rule.cjs`. Las convenciones se derivan del árbol actual (`convenciones-codigo.md`, 14 invariantes de scene + 2 reglas de firma + regla de listas), no de las de kakebot.
- Corregidos 3 defectos del código de origen: timeout que apagaba el typecheck en silencio, regex `\s` que bloqueaba ternarios multilínea (2 falsos positivos), y números de línea corridos por el strip de comentarios. Aislamiento por worktree (hash de raíz en lock y tsBuildInfo) y preservación de `$$` en template literals de scenes.
- Refactorizadas 4 funciones con 4+ parámetros posicionales a parámetro objeto (`guardarPropiedadCobro`, `resumenFactory`, `actualizarEntidad`, `saldarColeccionDeMes`) para llevar la regla ampliada (las 4 formas de función) a 0 violaciones sobre las 88 fuentes.
- Borrados los huérfanos de eslint (`.eslintrc.js`, `.eslintignore`, `tsconfig.dev.json`). Build limpio, 22/22 gate tests, 0 violaciones de convención.
- `/technician-check` (5 issues: 4 fix / 1 defer) y `/audit-pr` (APPROVE, 0 findings) cerrados.

### Pendiente
- Commit(s) y merge a master (a cargo de Juan).
