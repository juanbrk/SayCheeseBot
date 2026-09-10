# SayCheeseBot — instrucciones de proyecto

Bot de Telegram que funciona como la libreta contable compartida de dos socias.
Registra cobros a clientes y pagos, y calcula quién le debe cuánto a quién cada mes.

**Stack:** Firebase Cloud Functions + Firestore + Telegraf (TypeScript), todo bajo
`functions/`. El idioma del dominio es español y así se mantiene: `Cobro`, `Pago`,
`Balance`, `Resumen`, `Socias`.

---

## Ticket Tracking (TICKET.md)

Cada worktree lleva su seguimiento en `TICKET.md`, en la raíz del worktree
(`git rev-parse --show-toplevel`). El archivo de este repo está **en español**
(`SayCheeseBot` resuelve a `es` en `~/.claude/settings.json`).

**Es local, siempre.** Está en `.gitignore` y nunca se commitea: contiene notas
internas de review y motivos de `defer`/`avoid`. Si alguna vez aparece trackeado,
sacarlo con `git rm --cached TICKET.md`.

### Las 6 secciones — nunca una séptima

| # | Sección | Contiene |
|---|---|---|
| 1 | `## Contexto` | Qué problema resuelve el ticket |
| 2 | `## Pendientes` | Tareas por hacer: del plan, de audits, de hallazgos |
| 3 | `## Criterios de aceptación` | Qué hace que el ticket esté completo |
| 4 | `## Hecho` | Tareas realizadas, con el SHA del commit |
| 5 | `## Diferido` | Decisiones diferidas o que ameritan ticket aparte |
| 6 | `## Checkpoints` | Estado de las dos pasadas de revisión |

Línea 1 siempre: `<!-- ticket-schema: v1 lang=es -->`.

**Límite de 150 líneas.** Al pasarlo, `/ticket-consolidate` lo comprime. Nunca se
comprimen los criterios de aceptación, los checkpoints, ni las entradas con
`PENDING-SHA` y su marcador.

### El contrato PENDING-SHA

Claude nunca corre `git commit`. Cuando `/commit` escribe una entrada en Hecho, el
commit todavía no existe, así que escribe el literal `` `PENDING-SHA` `` más un
marcador con el `HEAD` de ese momento:

```markdown
## Hecho

<!-- pending-since: a1b2c3d -->
- `PENDING-SHA` — Descripción del cambio
```

El hook `ticket-backfill.cjs` lo resuelve **solo**, en el próximo mensaje después de
que exista un commit real. No hace falta volver a correr `/commit`.

**Ningún skill escribe jamás un SHA real.** Sólo ese hook.

### Merge, nunca clobber

`TICKET.md` es propiedad compartida: `/audit-pr` agrega hallazgos mientras `/commit`
los cierra. Un write incondicional destruye el trabajo del otro. Se mergea **por el
token del ID** entre corchetes (`**[M1]**`, `**[T2]**`), nunca por el texto de la
descripción — un humano pudo haberlo reescrito.

### Los dos hooks

Ambos son `.cjs` (ningún `package.json` de este repo declara `"type": "module"`, pero
la extensión explícita evita el `ReferenceError` en `require()` si eso cambia).
Se cablean con `$CLAUDE_PROJECT_DIR`, la única forma que es a la vez absoluta y local
al worktree.

| Hook | Evento | Qué hace |
|---|---|---|
| `.claude/hooks/ticket-check.cjs` | `PostToolUse` (`Edit\|Write\|MultiEdit`) | Editar código fuente desmarca `pr-audit`. Editar TICKET.md sólo chequea el tamaño. |
| `.claude/hooks/ticket-backfill.cjs` | `UserPromptSubmit` | Reemplaza `PENDING-SHA` por el SHA real cuando `HEAD` avanzó. |

Ninguno de los dos crea `TICKET.md`, crea secciones, ni bloquea nada (salen con 0
siempre). `ticket-check.cjs` **no** tiene matcher `Bash`: nunca dispararía, porque
Claude no ejecuta `git commit`.

### Quién tilda cada checkpoint

- `pr-audit` → lo tilda `/audit-pr`; lo **desmarca** `ticket-check.cjs` cuando se
  toca código después.
- `technician-check` → lo tilda **únicamente** `/technician-check`. Ningún hook ni
  ningún otro skill lo toca jamás.

Convención completa y autoritativa: `~/.claude/shared/ticket-md.md`.

---

## Gate de validación — una iteración por vez

El problema que resuelve: sin esto, Claude agarra un plan de 7 pasos y lo ejecuta
entero de un saque. Cuando termina, ya no hay nada que revisar paso a paso — hay que
auditar un changeset gigante de una sola vez, que es exactamente lo que no queremos.

El mecanismo son tres hooks y un archivo centinela,
`.claude/.awaiting-validation.json` (gitignoreado, efímero):

| Hook | Evento | Qué hace |
|---|---|---|
| `gate-on-task-complete.cjs` | `PostToolUse` (`TaskUpdate`) | Marcar una tarea `completed` **arma** el gate: escribe el centinela |
| `deny-if-awaiting-validation.cjs` | `PreToolUse` (`Edit\|Write\|MultiEdit\|Bash`) | Con el gate armado, rechaza toda escritura con exit 2 |
| `clear-validation-gate.cjs` | `UserPromptSubmit` | Borra el centinela: el próximo mensaje de Juan **libera** el gate |

La consecuencia práctica para Claude: **marcar una tarea como completa es el último
acto del turno.** Todas las ediciones y toda la verificación del paso van antes. Después
sólo queda presentar qué se hizo, cómo probarlo, y esperar.

Claude no puede destrabarse solo. Borrar el centinela requiere Bash o Write, y el hook
de deny frena a los dos. La única llave es que Juan mande un mensaje.

**TTL de 3 horas.** Si una sesión muere con el gate armado y nunca llega un mensaje
siguiente, el centinela vence solo en vez de dejar el repo en modo sólo-lectura para
siempre.

### Dos diferencias con el original (`estudio-lata-frontend`)

1. **El matcher del deny incluye `Bash`.** Allá es sólo `Edit|Write|MultiEdit`, y eso
   deja el gate en puro adorno: un `sed -i`, un heredoc o un `>` escriben archivos
   igual que Write. Acá los comandos Bash se inspeccionan por firma de escritura
   (`sed -i`, `perl -i`, `mv`/`cp`/`rm`, `tee`, redirecciones). Lo de sólo lectura
   —`git status`, `tsc`, `grep`, `npm run build`— pasa sin tocar. Las redirecciones a
   `/dev/null`, `/tmp` y al scratchpad se ignoran a propósito.
2. **La raíz se resuelve por `git rev-parse`, no por `__dirname/../..`.** El original
   deriva la raíz de la ubicación del hook, así que desde un worktree escribe el
   centinela en el repo equivocado. Acá se usa la misma cadena que los hooks de ticket:
   `payload.cwd` → `$CLAUDE_PROJECT_DIR` → `process.cwd()`, y después
   `git rev-parse --show-toplevel`, normalizando symlinks con `realpathSync`.

### `block-git-commit.cjs`

Cuarto hook, `PreToolUse` sobre `Bash`: rechaza cualquier `git commit`. Hasta ahora eso
era sólo una convención escrita; ahora está impuesto. Es la otra mitad del gate — Juan
commitea a mano, y ese acto es el punto de control real entre una iteración y la
siguiente. Es también lo que le da sentido al contrato `PENDING-SHA`: si Claude pudiera
commitear, no harían falta ni el marcador `pending-since` ni el hook de backfill.

### Cómo se verifica

```bash
bash .claude/hooks/test-gate.sh   # → "RESULTADO: 22 pasaron, 0 fallaron"
```

Corre los cuatro hooks contra un repo git descartable en `$TMPDIR`. Nunca toca este
repo ni su `TICKET.md`. Se puede correr las veces que haga falta.

**Los hooks se leen al arrancar la sesión** — nada de esto tiene efecto hasta reiniciar
Claude Code.

---
