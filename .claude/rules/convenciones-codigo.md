# Convenciones de código de SayCheeseBot

Reglamento derivado de lo que el código **ya hace**, no de una preferencia importada.
Cada regla listada acá parte de 0 violaciones contra el árbol actual — es lo que permite
que los hooks de `.claude/hooks/` que la imponen sean bloqueantes sin frenar trabajo
legítimo. Evidencia completa: `~/.claude/plans/we-need-to-implement-peaceful-penguin.md`.

Este documento es la fuente de verdad para `check-scene-wizard.cjs` (P8), `check-firmas.cjs`
(P7) y `check-list-bullets.cjs` (P5). Cambiar una regla acá implica cambiar el hook que la
impone, y viceversa.

---

## Los 14 invariantes de scene

Las 7 scenes de `functions/src/modules/scenes/**/*.ts` que definen un
`Scenes.WizardScene` — `registrarCliente.ts`, `registrarCobro.ts`,
`pagos/registrarNuevoPago.ts`, `saldos/registrarSaldoDeudaMensual.ts`,
`saldos/registrarSaldoDeudaTotal.ts`, `cobro/visualizarMovimientos.ts`,
`pagos/visualizarMovimientosPagos.ts` — comparten 14 invariantes, verificados 7/7 contra
el árbol actual. `general.ts` no define ninguna scene y no está sujeto a estas reglas.

Los dos que previenen bugs reales de verdad, no sólo estilo:

- **R9 — la scene está registrada en el `Scenes.Stage` de `functions/src/bot.ts:44-52`.**
  Una scene nueva que no se agrega ahí queda muerta sin un solo error de compilación ni
  de runtime: `noUnusedLocals` no la detecta porque el wizard está exportado. Esta regla
  depende de un archivo *distinto* al que se está editando, así que sólo puede ser
  advisory (`PostToolUse`), nunca bloqueante.
- **R4 — hay al menos un `.hears(["salir","Salir","cancelar","Cancelar"], …)`.** Sin eso
  el usuario queda encerrado en el wizard: ni `/menu` lo saca, porque
  `stage.middleware()` (`bot.ts:62`) intercepta el mensaje antes de que llegue al
  handler de comandos.

Los otros 12, todos verificables por texto/regex sobre el contenido mergeado del archivo:

| # | Invariante |
|---|---|
| R1 | `export const <X> = new Scenes.WizardScene(` — export nombrado, nunca default |
| R2 | El id string del constructor (primer argumento) termina en `-wizard` |
| R3 | El archivo define una función local `leaveScene` |
| R5 | Importa `ExtendedContext` de `config/context/myContext` (profundidad relativa según anidado) |
| R6 | Importa `avanzar` **y** `solicitarIngresoMenu` de `./general` (o `../general`) |
| R7 | Usa `new Composer<ExtendedContext>()` para los pasos posteriores al primero |
| R8 | El nombre exportado contiene la palabra `wizard` (en cualquier posición, cualquier casing) |
| R10 | Llama `ctx.scene.leave()` en al menos un punto de salida |
| R11 | Usa `avanzar(ctx)` para avanzar de paso — nunca `ctx.wizard.next()` directo (`0` ocurrencias fuera de `general.ts`, que es donde vive el wrapper) |
| R12 | Usa `ctx.wizard.selectStep(` con un literal numérico para saltos — nunca un valor calculado |
| R13 | `new Scenes.WizardScene(` se instancia sin parámetro de tipo genérico (el tipeo llega por `ExtendedContext` en cada step, no por `WizardScene<T>`) |
| R14 | Registra al menos un `.on("message", …)` |

**Reglas candidatas que NO llegaron a 7/7** — se documentan para que nadie las reintroduzca
creyendo que son convención:

- Sufijo `Wizard` en el nombre exportado — **2/7**.
- Prefijo `wizard` en el nombre exportado — **5/7**.
- El primer paso es `async` — **6/7**, falla `registrarSaldoDeudaTotal.ts:18` (`primerPaso`
  no es `async`).
- Los nombres de paso llevan un prefijo de dominio (`obtener-`, `validar-`, `confirmar-`) —
  **6/7**, falla `registrarSaldoDeudaTotal.ts`, que nombra sus pasos por ordinal
  (`primerPaso`, `segundoPaso`, `tercerPaso`...).
- `leaveScene` toma un solo parámetro — **6/7**, falla `registrarSaldoDeudaTotal.ts:259`
  (`leaveScene(ctx, seSaldoLaDeuda = false)`, porque necesita distinguir el mensaje de
  cancelación del de éxito).

### Manejo de mensaje inesperado — dos variantes válidas, nunca un `return;` desnudo

Ningún handler de `.on("message", …)` ni `.on("callback_query", …)` termina en un
`return;` mudo cuando el input no avanza el wizard. Hay dos convenciones reales, según el
tipo de wizard:

- **Wizards de input lineal** (`registrarCliente`, `registrarCobro`,
  `pagos/registrarNuevoPago`, `saldos/registrarSaldoDeudaMensual`) — texto inválido llama
  a `repetirPaso(ctx)`, que sólo loggea y no navega: el usuario reintenta en el mismo paso.
- **Wizards de menú** (`cobro/visualizarMovimientos`, `pagos/visualizarMovimientosPagos`,
  y parcialmente `saldos/registrarSaldoDeudaTotal`) — un mensaje de texto donde se
  esperaba un botón llama a `volverAlInicio(ctx)`, que reenvía las opciones y hace
  `ctx.wizard.selectStep(1)`.

`saldos/registrarSaldoDeudaMensual.ts` tiene un caso (`validarSeleccionYChequearDeuda.on("message")`,
:34-43) que inlinea la lógica de `volverAlInicio` sin nombrarla — el archivo es previo a
que ese helper se generalizara. Es una excepción conocida, no una tercera convención: no
se cuenta como violación porque no hay una firma de texto estable para exigir "delega a
un helper con este nombre exacto" sin acoplarse al nombre.

---

## Reglas de firma (2, no 3)

Impuestas por `check-firmas.cjs` + `lib/params-rule.cjs`, `PreToolUse`, bloqueante.

1. **4+ parámetros posicionales en una función** — usar un parámetro objeto en su lugar.
   Antes de P6 esta regla daba 1 violación real: `guardarPropiedadCobro`
   (`handlers/actions/cobro-actions.ts:112`, no la línea 85 que reportaría el stripper de
   comentarios de kakebot sin corregir — colapsa cada bloque `/* */` a una línea y corre
   el conteo). P6 la lleva a 0.
2. **Tipo inline en la misma línea que el parámetro** (patrón `}: {` en una firma) — se
   detecta con el regex anclado a la línea `/\}[ \t]*:[ \t]*\{/`, **no** `/\}\s*:\s*\{/`
   de kakebot. La versión de kakebot usa `\s`, que incluye `\n`, y matchea de punta a
   punta cualquier ternario multilínea — 2 falsos positivos reales:
   `scenes/cobro/visualizarMovimientos.ts:98-105` y
   `scenes/pagos/visualizarMovimientosPagos.ts:99-106`. Con el regex anclado, ambos dan 0.

**Descartada — no se porta:** la regla de destructuring de kakebot (prohibir
desestructurar objetos en el cuerpo de una función, no sólo en la firma). Da **19**
ocurrencias en 11 archivos de este repo. Eso no es deuda: es la convención local. Portar
esa regla sería importar la preferencia de kakebot y declarar mal 19 sitios de un árbol
que nunca se escribió pensando en ella.

---

## Regla de listas

Impuesta por `check-list-bullets.cjs`, `PreToolUse`, bloqueante sobre el texto de las
respuestas del bot (`ctx.reply`, `ctx.editMessageText`, template literals que las
alimentan).

**La convención de este repo es `- `, no `•`.** Evidencia: 0 ocurrencias de `•` en todo
el árbol, 0 de caracteres de árbol (`├─`, `└─`, `│`), y 37 líneas de lista con `- ` en
template literals de respuestas reales (`registrarCobro.ts:165-169`, entre otras).

La regla en sí — bloquear caracteres de árbol en el texto que le llega al usuario de
Telegram, porque no se renderizan y salen como texto crudo — es portable tal cual de
kakebot. Lo que **no** se porta es el mensaje de remediación: kakebot le dice al agente
que reemplace por `•`, que es exactamente la convención que rompería este repo. El
mensaje reescrito manda a `- `.

---

## Reglas que NO tenemos y por qué

Un inventario explícito, para que nadie reintroduzca por accidente algo que ya se evaluó
y se descartó a propósito.

- **`lint-feedback` (eslint).** No se porta. La migración a Node 22 sacó el script `lint`
  y las devDeps de eslint del repo; `.eslintrc.js`, `.eslintignore` y `tsconfig.dev.json`
  quedaron huérfanos extendiendo 4 plugins no instalados — se borraron (P1). `tsc` ya
  corre con `strict` + `noUnusedLocals` + `noImplicitReturns` en cada edición; reinstalar
  eslint 8 + 4 plugins para recuperar lo que el compilador ya cubre es mal ROI.
- **Destructuring en el cuerpo de una función.** Ver arriba — 19 ocurrencias **son** la
  convención, no una violación a corregir.
- **`check-raw-edit-message`.** Diferido. Presupone un helper `editarOResponder(ctx, ...)`
  que no existe: `modules/utils/replies.ts` sólo exporta `replyConMarkup` (:17), que
  siempre termina en `ctx.reply()` y nunca toca `editMessageText`. Las 45 llamadas
  directas a `ctx.reply`/`ctx.editMessageText` no tienen adónde migrar sin crear antes
  esa abstracción — ticket aparte.
- **Un hook `Stop` de fin de sesión** (`track-modified-file` + `check-session-params` de
  kakebot). No se porta. Un `Stop` que sale 2 deadlockea con el gate de validación de
  este repo: el `Stop` exigiría arreglar algo, pero `deny-if-awaiting-validation.cjs`
  rechaza toda escritura mientras el gate esté armado. Claude queda obligado a corregir e
  imposibilitado de escribir — sale sólo por el TTL de 3 h o por un mensaje de Juan.
- **La ceremonia completa de wizard de kakebot** — `CANCEL_REGEX`, `on("photo")`,
  `on("document")`, `repromptCurrentStep`, `_SCENE_ID` — está en **0/7** contra este
  árbol. Ninguna scene de SayCheeseBot usa esos patrones; no se porta nada de esa lista.
- **`commit-dream-check`.** Fuera de alcance. Depende de `/mem-consolidate`,
  `dream-state.json` y `.claude/memory/`, que no existen en este repo.
