# Decisions Log

## Known Hazards

### kakebot hooks — 3 defectos latentes que siguen activos allá

**Cause**: el stripper de comentarios colapsa bloques `/* */` a una línea (corre los números de línea); el regex de tipo inline usa `\s` en vez de `[ \t]` (matchea ternarios multilínea); el timeout de tsc (15s) es insuficiente y `spawnSync` devuelve `status: null` con SIGTERM, así que la rama de reporte no imprime nada.
**Fix**: los 3 están corregidos en los hooks de este repo (`stripPreservingLines`, regex anclado `/\}[ \t]*:[ \t]*\{/`, timeout 60s + `--incremental`). Siguen activos en kakebot-backend.

---

## Architectural Decisions Log

| Date | Decision | Why | Status |
|---|---|---|---|
| 2026-09-23–24 | Deuda de la revivida: no se migran eslint (revisar si `tsc` no alcanza), triggers `/v1` (si sale de v7/gen1), tests y campos `…Fer…` (ambos en D7 `enmvhiJN`), `telegraf-inline-menu` (si rompe con telegraf); `sessions` con TTL deslizante 30 días en `expiraEn` (C1–C5) | Migrar cuesta más que convivir; D7 reescribe los mismos campos | Active |
| 2026-09-10 – 2026-09-18 | Convenciones derivadas del árbol actual (0 violaciones base), no de kakebot; eslint no se porta (`tsc` cubre con `strict`); destructuring en cuerpo descartado (19 ocurrencias = convención local); hook `Stop` no se porta (deadlock con el gate de validación); `check-raw-edit-message` diferido (falta abstracción `editarOResponder`) | Las reglas importadas deben arrancar en 0 contra el árbol receptor; si no, la regla está mal, no el código | Active |
| 2026-09-10 | La regla de firma cubre las 4 formas de definir función (declaración, asignación, método, propiedad arrow), no solo `function f(…)` — 24 funciones con forma `const x = async (…) => {}` quedarían sin cubrir; callbacks anónimos inline afuera a propósito (la aridad la impone la API, no el autor) | Active |
| 2026-09-18 | Workflow de deploy: SA como secret (no hardcodeado como en kakebot) para flexibilidad; `NODE_ENV=production` omitido (Firebase lo setea solo en runtime) | Mantener el workflow honesto: sólo declarar lo que SayCheeseBot necesita, no copiar por paridad | Active |
| 2026-07-31 | Convención TICKET.md instalada; TICKET.md en español para este repo (`settings.json` resuelve a `es`); hooks de ticket como `.cjs` con `$CLAUDE_PROJECT_DIR` | Seguimiento por worktree, local (gitignoreado), nunca commiteado | Active |

---

## Debugging Checklist

_(vacío — agregar entradas a medida que surjan patrones de debugging recurrentes)_

---

## Performance Guidelines

- `tsc --noEmit --incremental` baja de ~12s (frío) a ~1.3s (tibio). El `tsBuildInfoFile` vive en `os.tmpdir()` con hash de raíz para no compartir entre worktrees.
