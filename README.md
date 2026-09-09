# SayCheeseBot

Bot de Telegram que funciona como la libreta contable compartida de **Flor** y **Marian**.
Registra los cobros a clientes y los pagos, y calcula quién le debe cuánto a quién cada mes.

**Stack:** Firebase Cloud Functions (triggers v1) + Firestore + Telegraf, TypeScript.
Todo el código vive en `functions/`.

| | |
|---|---|
| **Proyecto Firebase** | `my-first-bot-da27e` (alias `default`) |
| **Región** | `us-central1` |
| **Runtime** | Node 22 |

---

## Puesta en marcha

### 1. Requisitos

- **Node 22.** `firebase-admin@14` lo exige. Con `nvm`: `nvm use 22`.
- Firebase CLI (`npm i -g firebase-tools`) y `firebase login`.
- El proyecto tiene que estar en **plan Blaze**: en el plan gratuito las functions no
  pueden hacer llamadas salientes a `api.telegram.org` y el bot no responde nunca.

### 2. Token del bot

```bash
cp functions/.env.example functions/.env
# editar functions/.env y pegar el token que da @BotFather
```

`functions/.env` está gitignoreado. **No existe más `functions.config()`** — Firebase lo
dio de baja; el token se lee de `process.env.TELEGRAM_TOKEN`.

En el mismo `.env`, completar también `TELEGRAM_ALLOWED_IDS` con los ids numéricos de
Telegram de Flor y Marian (coma-separados, sin espacios). Sin esto el bot **rechaza a
todo el mundo** — es fail-closed a propósito, ver A1 en `TICKET.md`. Para conseguir cada
id: que le escriban a [@userinfobot](https://t.me/userinfobot) desde su cuenta.

### 3. Instalar y compilar

```bash
cd functions
npm install
npm run build      # tsc a secas; ver "Sobre el lint" más abajo
```

### 4. Desplegar

```bash
firebase deploy --only functions --project my-first-bot-da27e
```

Se despliegan tres functions:

| Function | Tipo | Qué hace |
|---|---|---|
| `api` | HTTPS | Recibe el webhook de Telegram |
| `onBalanceCreated` | Firestore `onCreate` | De cada Balance genera o acumula el Resumen mensual |
| `onResumenAlterado` | Firestore `onUpdate` | Al saldar un resumen, marca como saldados los Cobros y Pagos del mes |

---

## ⚠️ Pasos manuales que NO hace el deploy

Esto es lo que hay que hacer a mano cada vez que cambia el token o la URL de la function.
**Ninguno de los dos está automatizado en el repo** — que no estuvieran documentados fue
buena parte de por qué revivir el bot costó lo que costó.

### Registrar el webhook

Sin esto, Telegram no le manda nada al bot y no pasa absolutamente nada.

```bash
curl -F "url=https://us-central1-my-first-bot-da27e.cloudfunctions.net/api" \
     "https://api.telegram.org/bot<TOKEN>/setWebhook"
```

Verificar que quedó bien:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Registrar el menú de comandos

Se hace una vez por bot. Antes esto vivía en el código y salía en cada cold start —
también durante el análisis del deploy, con unhandled rejection si el token era inválido.

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
     -H "Content-Type: application/json" \
     -d '{"commands":[{"command":"start","description":"Iniciar"},{"command":"menu","description":"Menú"}]}'
```

### Sembrar `Choices/camposCliente`

El menú de "editar cliente" lee este documento (`choices-service.ts` → `getCamposCliente`).
Es configuración, no dato de usuario: si se vacía Firestore hay que recrearlo, o el menú
sale vacío.

Documento `Choices/camposCliente`:

```json
{ "nombre": "nombre", "telefono": "telefono" }
```

---

## Verificación — `doctor.cjs`

Los bugs que se arreglaron al revivir el bot **no se ven desde Telegram**. El peor de
todos (escrituras sin `await` bajo un trigger de Firestore) le contesta "listo" al
usuario exactamente igual cuando funciona que cuando la escritura se pierde: la única
diferencia está en Firestore y aparece recién ~30 s después. Usar el bot y ver que
"anda" no prueba nada. Hay que leer los datos y verificar las cuentas.

```bash
nvm use 22                                          # firebase-admin@14 exige Node 22
gcloud auth application-default login               # una sola vez

node functions/scripts/doctor.cjs preflight   # antes de desplegar
node functions/scripts/doctor.cjs webhook     # después de registrar el webhook
node functions/scripts/doctor.cjs seed        # re-sembrar Choices/camposCliente + Cliente de prueba
node functions/scripts/doctor.cjs estado      # después de usar el bot: las cuentas
```

Así apunta a **producción** (ADC). Contra el emulador de desarrollo local hacen falta dos
variables de entorno más — ver "Desarrollo local" más abajo.

Sólo lee, salvo `seed`, que escribe `Choices/camposCliente` y un par de `Cliente` de
prueba. Sale con 1 si algo falla, así que sirve en un script.

Lo que verifica `estado`, contra los datos reales:

| Chequeo | Qué bug atrapa |
|---|---|
| Ningún documento contiene `"Fer"` | El renombre incompleto |
| Cada Cobro/Pago tiene su Balance | Escrituras perdidas en el alta (5.2) |
| `totalCobrado` = suma real de los Cobros del mes | Acumulación mal del resumen |
| `totalCobradoPorFer` + `PorFlor` = `totalCobrado` | Partición por socia rota |
| `correspondeACadaSocia` = `totalCobrado / 2` | La cuenta del 50/50 |
| Con `Resumen.saldado = true`, **todos** los Cobros del mes saldados | **5.1 — el peor: la escritura del trigger se pierde** |
| Los saldos no quedan todos a nombre de la misma socia | El hardcodeo de `pagosFactory` |

Está probado contra el emulador con datos sanos y con datos deliberadamente rotos: no
sólo pasa en verde, también **detecta** cada una de esas fallas y las nombra por `uid`.

---

## Vaciar Firestore

Para arrancar de cero. **Borra datos de verdad y no hay undo.**

```bash
firebase firestore:delete --all-collections --project my-first-bot-da27e
```

Sin `--force` pide confirmación interactiva, que es lo que se quiere acá. Después hay
que volver a sembrar la configuración:

```bash
node functions/scripts/doctor.cjs seed
```

`sessions` tiene que desaparecer sí o sí: las sesiones viejas guardan valores de `Socias`
serializados y estados de wizard a medio terminar que rompen las scenes después del
renombre.

---

## Desarrollo local

Un solo modo de desarrollo: emulador de Firebase (`functions` + `firestore`) + el bot en
**polling** contra un bot de test aparte, `@botito_testitoBot` — así no hace falta ngrok
ni re-registrar el webhook en cada sesión.

### Una vez

1. Crear `@botito_testitoBot` en [@BotFather](https://t.me/BotFather) y guardar su token.
2. `functions/.env.local` (gitignoreado) con el token del bot de test, en **dos** claves:

   ```
   TELEGRAM_TOKEN=<token de @botito_testitoBot>
   TELEGRAM_TOKEN_TEST=<el mismo token>
   TELEGRAM_ALLOWED_IDS=<tu id de Telegram>
   ```

   `TELEGRAM_TOKEN` ahí (no en `.env`) hace que la function `api` emulada use el token de
   test en vez del de producción. `TELEGRAM_TOKEN_TEST` es lo único que lee `dev.ts` —
   nunca lee `TELEGRAM_TOKEN` a secas, para que el token de prod no pueda llegar por un
   typo o un copy-paste. `TELEGRAM_ALLOWED_IDS` hace falta desde que existe la allowlist
   (A1): sin tu id acá, `@botito_testitoBot` te va a ignorar a vos también.
3. `firebase-tools` tiene que estar instalado bajo Node 22 (no alcanza con tenerlo bajo
   otra versión de `nvm`): `nvm use 22 && npm install -g firebase-tools`.

### Cada vez

```bash
npm run go       # desde la raíz del repo
```

Levanta tres procesos de larga vida + un cuarto que corre una sola vez:

| Proceso | Qué hace |
|---|---|
| `emu`  | `firebase emulators:start --only functions,firestore` |
| `tsc`  | `tsc -w` |
| `bot`  | `node --watch functions/lib/src/dev.js` — el bot en polling |
| `seed` | espera a que el puerto `8080` esté arriba y corre `doctor.cjs seed` una vez |

El emulador de Firestore **no persiste nada entre arranques** — cada `npm run go` parte
de una base vacía, por eso el seed corre solo en cada arranque en vez de una sola vez.

UI del emulador: `http://127.0.0.1:4000`. `Ctrl-C` corta los cuatro procesos.

⚠️ **`dev.ts` corre aparte del emulador**, como proceso `node` standalone — no como una
Cloud Function que el emulador gestiona. `go.sh` le exporta dos variables a mano antes de
levantar todo, porque ninguna de las dos le llega sola:

- `FIRESTORE_EMULATOR_HOST` — sin ella, la guarda de `dev.ts` aborta directamente.
- `GCLOUD_PROJECT` — sin ella, `initializeApp()` (en `firebase.ts`, que no fija
  `projectId`) resuelve OTRO proyecto contra el mismo emulador — mismo Firestore,
  namespace distinto — y todo lo que lee el bot sale vacío **en silencio**, aunque la UI
  del emulador y `doctor.cjs` sí vean los datos. Costó un bug real dar con esto.

Si corrés `doctor.cjs` a mano contra el emulador (fuera de `go.sh`), necesitás las dos:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=my-first-bot-da27e \
  node functions/scripts/doctor.cjs estado
```

---

## Cómo está organizado

```
functions/
├── config/context/myContext.ts   ExtendedContext: session + scene + wizard tipados
└── src/
    ├── index.ts                  Armado del bot, middlewares, exports de functions
    ├── controllers/              Triggers de Firestore
    ├── handlers/
    │   ├── menus/                Árbol de menús (telegraf-inline-menu)
    │   ├── actions/              Lógica de flujo + armado de mensajes
    │   └── updates/              Router de mensajes sueltos
    ├── modules/
    │   ├── scenes/               Wizards multi-paso (Telegraf WizardScene)
    │   ├── factories/            Construcción de Balance / Resumen / Pago (la plata)
    │   ├── models/ enums/ utils/
    └── services/                 Acceso a Firestore
```

### Las dos formas de UI

Conviven dos paradigmas y conviene tenerlo claro antes de tocar nada:

- **`telegraf-inline-menu`** (`handlers/menus/`) — árbol declarativo, se re-renderiza
  solo. Sirve para navegar y elegir cosas. Estado en `ctx.session`.
- **`WizardScene`** (`modules/scenes/`) — máquina de pasos, un `Composer` por paso. Para
  cualquier carga de datos multi-paso. Estado en `ctx.scene.session`.

Los menús entran a los wizards con `ctx.scene.enter("<id>")`.

### El pipeline de la plata

```
Cobro/Pago  →  factory arma el Balance  →  escritura en Firestore
                     ↓ onCreate Balance
              se crea o acumula el Resumen del mes
                     ↓ onUpdate Resumen (si quedó saldado)
              se marcan como saldados los Cobros y Pagos del mes
```

Colecciones: `Cliente`, `Cobro`, `Pago`, `Balance`, `Resumen`, `Choices`, `sessions`.

---

## Cosas que sorprenden

- **`main` es `lib/src/index.js`, no `lib/index.js`.** `config/` queda fuera del `include`
  del tsconfig, así que tsc emite `lib/src/…` + `lib/config/…`. Mover el archivo de
  contexto o tocar el `include` cambia la raíz del emit y rompe el entrypoint en silencio.
- **Los campos de Firestore dicen "Fer".** `ferDebeAFlor`, `florDebeAFer`,
  `totalCobradoPorFer` y `leCorrespondeAFer` refieren a **Marian**: se renombró el enum
  pero no los campos, para no arrastrar una migración. Está explicado en
  `modules/enums/socias.ts` y anotado como **D1** en `roadmap.md`.
- **`firestore.rules` protege `clientes`, una colección que no existe** (la real es
  `Cliente`). Hoy es inocuo porque el Admin SDK saltea las reglas. Anotado como **D4**.
- **Sobre el lint:** `npm run build` es `tsc` a secas y `predeploy` ya no corre lint. El
  stack viejo (`eslint@7` + `@typescript-eslint@3` + `eslint-config-google`) no parsea
  TypeScript moderno y bloqueaba el deploy. `.eslintrc.js` sigue en el repo como semilla
  para cuando se retome: es **D3** en `roadmap.md`.

---

## Seguimiento

- **`roadmap.md`** (versionado) — todo el trabajo conocido y si tiene tarjeta de Trello.
- **`TICKET.md`** (local, gitignoreado) — el ticket en curso. Ver `CLAUDE.md`.
