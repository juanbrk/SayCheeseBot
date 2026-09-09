# Roadmap — SayCheeseBot

Registro de todo el trabajo conocido y si tiene o no tarjeta de Trello.

A diferencia de `TICKET.md` (local, gitignoreado, sólo el ticket en curso), **este archivo
se versiona**: es la memoria de largo plazo del proyecto. Cuando algo se difiere en
`TICKET.md`, tiene que aparecer acá — si no, se pierde en un archivo que nadie versiona.

| | |
|---|---|
| **Board** | Estudio Lata |
| **Lista destino** | Backlog (`backlogListId` en `trello.config.json`) |
| **Crear tarjeta** | `node ~/Documents/proyectos/website-design-workflow/scripts/trello/bin/create-card.js` |
| **Etiquetas disponibles** | FUNCIONALIDAD · ERROR · DEUDA TECNICA · MEJORA · AUTOMATIZACIÓN |

**Leyenda de Estado:** ✅ hecho · 🟡 en curso · ⚪️ diferido
**Leyenda de Trello:** ⬜️ sin tarjeta · ✅ `<card-id>`

> Nota: `SayCheeseBot` comparte board con el resto de Estudio Lata (según
> `~/.claude/settings.json`). Si en algún momento merece board propio, hay que correr
> `trello-backlog setup` y actualizar esa config.

---

## Revivir el bot — ticket en curso

Detalle y `file:line` de cada uno en `TICKET.md` (sección Pendientes) y en el plan
`~/.claude/plans/the-bot-will-be-quizzical-blossom.md`.

| Item | Tipo | Estado | Trello |
|---|---|---|---|
| **A.1** Hooks de tracking (`ticket-check` + `ticket-backfill`) — *hecho* | AUTOMATIZACIÓN | ✅ hecho | ⬜️ |
| **A.2/A.3** `TICKET.md` + `roadmap.md` — *hecho* | AUTOMATIZACIÓN | ✅ hecho | ⬜️ |
| **A.4** Gate de validación (una iteración por vez) + `block-git-commit` — *hecho* | AUTOMATIZACIÓN | ✅ hecho | ⬜️ |
| **S6** Borrar código muerto (`b.ts`, `visualizarCobrosMes`, `presentarCobrosMes`, `obtenerSocias`) | DEUDA TECNICA | ✅ hecho | ⬜️ |
| **S1** Toolchain: Node 22 + firebase-functions v7 conservando los triggers v1 | DEUDA TECNICA | ✅ hecho | ⬜️ |
| **S1** Sacar `lint` del `predeploy` (bloquea el deploy con `@typescript-eslint@3`) | DEUDA TECNICA | ✅ hecho | ⬜️ |
| **S2** Token fuera de `functions.config()` → `.env` | DEUDA TECNICA | ✅ hecho | ⬜️ |
| **S3** Validar o reemplazar `telegraf-session-firestore` | DEUDA TECNICA | ✅ hecho | ⬜️ |
| **S4** Renombre FER → MARIAN | FUNCIONALIDAD | ✅ hecho | ⬜️ |
| **S4** 🔴 `registradoPor` hardcodeado en `pagosFactory.ts:30` rompe el saldo de deuda | ERROR | ✅ hecho | ⬜️ |
| **S5.1/5.2** Escrituras sin `await` bajo trigger de Firestore — pérdida silenciosa | ERROR | ✅ hecho | ⬜️ |
| **S5.3** Fechas inválidas `-31` al saldar el mes (febrero y meses de 30 días) | ERROR | ✅ hecho | ⬜️ |
| **S5.4** `dividieronLaPlata` no se lee al visualizar pagos | ERROR | ✅ hecho | ⬜️ |
| **S5.5** Fallbacks hardcodeados a `"2021"` | ERROR | ✅ hecho | ⬜️ |
| **S5.6** `setMyCommands()` en module load | ERROR | ✅ hecho | ⬜️ |
| **S7** Deploy + registro del webhook + `README.md` | AUTOMATIZACIÓN | ✅ hecho | ⬜️ |

## Diferido — sin fecha

Cada uno corresponde a un `[D#]` de la sección Diferido de `TICKET.md`.

| Item | Tipo | Estado | Trello |
|---|---|---|---|
| **D1** Renombrar los campos Firestore `ferDebeAFlor` / `florDebeAFer` / `totalCobradoPorFer` / `leCorrespondeAFer` | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D2** Migrar los triggers v1 → v2 | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D3** Reparar el toolchain de ESLint y devolver `lint` al predeploy | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D4** `firestore.rules` protege `clientes`, colección inexistente (la real es `Cliente`) | ERROR | ⚪️ | ⬜️ |
| **D5** Tests + CI | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D6** Resucitar `saldar-deuda-wizard` (saldo mensual, hoy inalcanzable) | FUNCIONALIDAD | ⚪️ | ⬜️ |
| **D7** Des-hardcodear el modelo de dos socias | FUNCIONALIDAD | ⚪️ | ⬜️ |
| **D8** ~25 `ctx.reply` / `answerCbQuery` sin `await` en las scenes | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D9** La colección `sessions` no tiene TTL ni limpieza — crece sin límite | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D10** Deuda exactamente cero elige deudora arbitraria | ERROR | ⚪️ | ⬜️ |
| **D11** Mover el token a Secret Manager | MEJORA | ⚪️ | ⬜️ |
| **D12** Borrar el `package.json` suelto de la raíz | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D13** Normalizar los imports de `telegraf-inline-menu` (10 por `dist/source`, 6 por la raíz) | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D14** `telegraf-inline-menu@6.3.0` está deprecado por el autor ("moved to grammY") | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |
| **D15** El gate sólo se arma si Claude marca la tarea `completed` — no hay disparador por volumen de cambios | AUTOMATIZACIÓN | ⚪️ | ⬜️ |
| **D16** `pagosFactory` no setea `dividieronLaPlata` en pagos de saldo, y `saldarPagosDeMes` filtra por `== false`: nunca los alcanza | ERROR | ⚪️ | ⬜️ |
| **D17** Portar los hooks de calidad de código de kakebot-backend (merge aditivo sobre `settings.json`) | DEUDA TECNICA | ⚪️ | ✅ `jsanyyE6` |
| **D18** `.eslintrc.js` y `.eslintignore` quedaron huérfanos al sacar lint del deploy | DEUDA TECNICA | ⚪️ | ✅ `9olUsdIJ` |

---

## Cómo se mantiene

1. Algo se difiere en `TICKET.md` → se agrega como fila acá, con su `[D#]`.
2. Se crea la tarjeta en Trello → `⬜️` pasa a `✅ <card-id>`.
3. La tarjeta se cierra → la fila se saca de la tabla (Trello queda como historial).

Las 34 filas arrancan casi todas sin tarjeta a propósito: este archivo existe justamente para hacer
visible ese hueco, no para taparlo.
