#!/usr/bin/env node
"use strict";

/**
 * doctor.cjs — verificación instrumentada de SayCheeseBot contra el proyecto real.
 *
 * ¿Por qué existe? Porque los bugs que se arreglaron en esta revivida NO se ven desde
 * Telegram. El caso peor (escrituras sin await bajo un trigger de Firestore) le contesta
 * "listo" al usuario exactamente igual cuando funciona que cuando la escritura se pierde.
 * La única diferencia está en Firestore, y aparece recién ~30s después. Hacer clic en el
 * bot y ver que "anda" no prueba nada: hay que leer los datos y verificar las cuentas.
 *
 * Uso (requiere Node 22 — firebase-admin@14 declara engines >=22):
 *
 *   nvm use 22
 *   node functions/scripts/doctor.cjs preflight    # antes de desplegar
 *   node functions/scripts/doctor.cjs webhook      # después de registrar el webhook
 *   node functions/scripts/doctor.cjs seed         # re-sembrar Choices/camposCliente + Cliente base
 *   node functions/scripts/doctor.cjs estado       # después de usar el bot: las cuentas
 *
 * Credenciales: usa Application Default Credentials.
 *   gcloud auth application-default login    (una vez)
 *
 * Sólo LEE, salvo `seed`, que escribe Choices/camposCliente y un par de Cliente de prueba.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const PROJECT_ID = "my-first-bot-da27e";
const REGION = "us-central1";
const RAIZ = path.resolve(__dirname, "..");
const URL_FUNCTION = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/api`;

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const mal = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`  \x1b[2m·\x1b[0m ${m}`);
const aviso = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const titulo = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

let fallas = 0;
const chequear = (cond, siOk, siMal) => {
  if (cond) ok(siOk);
  else {
    mal(siMal);
    fallas++;
  }
  return cond;
};

/** Lee TELEGRAM_TOKEN de functions/.env sin cargar dependencias. */
function leerToken() {
  const envPath = path.join(RAIZ, ".env");
  if (!fs.existsSync(envPath)) return null;
  const m = fs.readFileSync(envPath, "utf8").match(/^\s*TELEGRAM_TOKEN\s*=\s*(.+?)\s*$/m);
  return m ? m[1].replace(/^["']|["']$/g, "") : null;
}

/** Lee TELEGRAM_ALLOWED_IDS de functions/.env sin cargar dependencias. */
function leerIdsPermitidos() {
  const envPath = path.join(RAIZ, ".env");
  if (!fs.existsSync(envPath)) return null;
  const m = fs.readFileSync(envPath, "utf8").match(/^\s*TELEGRAM_ALLOWED_IDS\s*=\s*(.+?)\s*$/m);
  if (!m) return null;
  return m[1]
    .replace(/^["']|["']$/g, "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function getJSON(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (_) {
            resolve({ ok: false, description: `respuesta no-JSON (HTTP ${res.statusCode})` });
          }
        });
      })
      .on("error", (e) => resolve({ ok: false, description: e.message }));
  });
}

function firestore() {
  const mayor = Number(process.versions.node.split(".")[0]);
  if (mayor < 22) {
    console.error(`\n✗ Node ${process.versions.node}: firebase-admin@14 exige >= 22. Corré \`nvm use 22\`.\n`);
    process.exit(1);
  }
  const { initializeApp } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  initializeApp({ projectId: PROJECT_ID });
  return getFirestore();
}

const COLECCIONES = ["Cliente", "Cobro", "Pago", "Balance", "Resumen", "Choices", "sessions"];
const SOCIAS_VALIDAS = new Set(["Marian", "Flor"]);

/** Timestamp de Firestore, Date, o string → Date. */
function aFecha(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

// ─────────────────────────────────────────────────────────────── preflight ──
async function preflight() {
  titulo("PREFLIGHT — antes de desplegar");

  const mayor = Number(process.versions.node.split(".")[0]);
  chequear(mayor >= 22, `Node ${process.versions.node} (>= 22)`, `Node ${process.versions.node} — hace falta 22. Corré \`nvm use 22\``);

  const token = leerToken();
  chequear(!!token, "functions/.env tiene TELEGRAM_TOKEN", "falta functions/.env o la variable TELEGRAM_TOKEN");

  const idsPermitidos = leerIdsPermitidos();
  chequear(
    !!idsPermitidos && idsPermitidos.length > 0,
    `TELEGRAM_ALLOWED_IDS cargado (${idsPermitidos ? idsPermitidos.length : 0} id(s))`,
    "falta TELEGRAM_ALLOWED_IDS o está vacío — el bot va a rechazar a TODOS (fail-closed, ver A1)"
  );
  if (idsPermitidos) {
    const idsInvalidos = idsPermitidos.filter((id) => !/^\d+$/.test(id));
    chequear(
      idsInvalidos.length === 0,
      "todos los ids son numéricos",
      `hay ids no numéricos en TELEGRAM_ALLOWED_IDS: ${idsInvalidos.join(", ")}`
    );
  }

  if (token) {
    const esPlaceholder = /DUMMY|PLACEHOLDER|DISCOVERY|123456:/i.test(token);
    chequear(!esPlaceholder, "el token no es un placeholder", "el token sigue siendo el placeholder de prueba — pegá el de @BotFather");
    chequear(/^\d+:[\w-]{30,}$/.test(token), "el token tiene la forma <id>:<secreto>", "el token no tiene la forma que espera Telegram");

    if (!esPlaceholder) {
      const me = await getJSON(`https://api.telegram.org/bot${token}/getMe`);
      if (chequear(me.ok, `Telegram acepta el token → @${me.result && me.result.username}`, `Telegram rechaza el token: ${me.description}`)) {
        info(`nombre del bot: ${me.result.first_name}  ·  id: ${me.result.id}`);
      }
    }
  }

  const main = path.join(RAIZ, "lib", "src", "index.js");
  chequear(fs.existsSync(main), "lib/src/index.js existe (npm run build corrió)", "falta lib/src/index.js — corré `npm --prefix functions run build`");
  if (fs.existsSync(main)) {
    const compilado = fs.readFileSync(main, "utf8");
    const exportadas = ["api", "onBalanceCreated", "onResumenAlterado"].filter((f) => compilado.includes(`exports.${f}`));
    chequear(exportadas.length === 3, `el build exporta las 3 functions: ${exportadas.join(", ")}`, `el build exporta ${exportadas.length}/3 functions: ${exportadas.join(", ") || "ninguna"}`);
  }

  console.log("");
  info("El plan Blaze no se puede verificar desde acá. Confirmalo en:");
  info(`https://console.firebase.google.com/project/${PROJECT_ID}/usage/details`);
}

// ───────────────────────────────────────────────────────────────── webhook ──
async function webhook() {
  titulo("WEBHOOK — ¿Telegram le está hablando al bot?");
  const token = leerToken();
  if (!token) {
    mal("no hay token en functions/.env");
    fallas++;
    return;
  }

  const r = await getJSON(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  if (!chequear(r.ok, "Telegram respondió getWebhookInfo", `Telegram falló: ${r.description}`)) return;

  const w = r.result;
  chequear(w.url === URL_FUNCTION, `apunta a la function correcta`, `apunta a "${w.url || "(vacío)"}" y debería ser ${URL_FUNCTION}`);
  chequear(!w.last_error_message, "sin errores de entrega", `último error de entrega: ${w.last_error_message} (${aFecha(w.last_error_date * 1000)})`);

  if (w.pending_update_count > 0) {
    aviso(`${w.pending_update_count} updates encolados sin entregar — el webhook está roto o la function no responde`);
    fallas++;
  } else {
    ok("cero updates encolados");
  }

  const cmds = await getJSON(`https://api.telegram.org/bot${token}/getMyCommands`);
  const lista = (cmds.result || []).map((c) => "/" + c.command);
  chequear(lista.length > 0, `menú de comandos registrado: ${lista.join(" ")}`, "no hay menú de comandos — falta el curl de setMyCommands");
}

// Uid = nombre con espacios -> "_" y todo en minúscula, igual que guardarCliente()
// en cliente-actions.ts:63. Usar ese mismo cálculo acá (en vez de un uid fijo a mano)
// mantiene el seed corriendo contra el mismo criterio que usa el bot real.
const SEED_CLIENTES = ["Lucía Fernández", "Martín Rodríguez"].map((nombre, i) => ({
  nombre,
  telefono: i === 0 ? "3511234567" : "3517654321",
  registradoPor: i === 0 ? "Marian" : "Flor",
  visible: true,
  uid: nombre.replace(/ /g, "_").toLowerCase(),
}));

// ──────────────────────────────────────────────────────────────────── seed ──
async function seed() {
  titulo("SEED — Choices/camposCliente");
  const db = firestore();
  const ref = db.collection("Choices").doc("camposCliente");
  const antes = await ref.get();
  info(antes.exists ? `ya existía: ${JSON.stringify(antes.data())}` : "no existía");
  await ref.set({ nombre: "nombre", telefono: "telefono" });
  const despues = await ref.get();
  ok(`escrito: ${JSON.stringify(despues.data())}`);
  info("Sin esto el menú CLIENTES → Editar sale vacío.");

  titulo("SEED — Cliente (base para probar COBROS/PAGOS)");
  for (const cliente of SEED_CLIENTES) {
    await db.collection("Cliente").doc(cliente.uid).set(cliente);
    ok(`Cliente/${cliente.uid} → ${cliente.nombre} (${cliente.telefono})`);
  }
  info("A propósito NO se siembran Cobro/Pago/Balance/Resumen: ese pipeline se valida");
  info("desde cero, cargándolo a mano desde el bot en cada sesión de prueba.");
}

// ────────────────────────────────────────────────────────────────── vaciar ──
/**
 * Borra TODO el contenido de las 7 colecciones antes del primer deploy con
 * Marian — arranca sin el historial de Fer. Sin `--confirmar` sólo cuenta
 * documentos, no borra nada: corré primero en dry-run y mirá los números.
 */
async function vaciar() {
  const confirmar = process.argv.includes("--confirmar");
  const db = firestore();

  titulo(confirmar ? `VACIAR — borrando de PRODUCCIÓN (${PROJECT_ID})` : "VACIAR — dry-run, no se borra nada");
  if (!confirmar) {
    aviso("Modo dry-run. Para borrar de verdad: `node functions/scripts/doctor.cjs vaciar --confirmar`");
  } else {
    aviso(`Proyecto: ${PROJECT_ID}. Esto borra TODO de las ${COLECCIONES.length} colecciones. No hay vuelta atrás.`);
  }
  console.log("");

  let total = 0;
  for (const c of COLECCIONES) {
    const snap = await db.collection(c).get();
    total += snap.size;
    if (!confirmar || snap.size === 0) {
      console.log(`  ${c.padEnd(10)} ${String(snap.size).padStart(4)} docs`);
      continue;
    }
    // Firestore no acepta más de 500 escrituras por batch.
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = db.batch();
      for (const doc of docs.slice(i, i + 400)) batch.delete(doc.ref);
      await batch.commit();
    }
    ok(`${c.padEnd(10)} ${String(snap.size).padStart(4)} docs borrados`);
  }

  console.log("");
  if (!confirmar) {
    info(`Total a borrar: ${total} doc(s) en ${COLECCIONES.length} colecciones.`);
    info("Nada se tocó todavía. Revisá los números y corré con `--confirmar` cuando estés seguro.");
  } else {
    ok(`Listo: ${total} doc(s) borrados de ${COLECCIONES.length} colecciones en ${PROJECT_ID}.`);
  }
}

// ────────────────────────────────────────────────────────────────── estado ──
async function estado() {
  const db = firestore();

  titulo("INVENTARIO");
  const docs = {};
  for (const c of COLECCIONES) {
    const snap = await db.collection(c).get();
    docs[c] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`  ${c.padEnd(10)} ${String(docs[c].length).padStart(4)} docs`);
  }

  const { Cobro, Pago, Balance, Resumen } = docs;

  if (!Cobro.length && !Pago.length) {
    aviso("No hay ni Cobros ni Pagos: todavía no hay nada que verificar.");
    aviso("Cargá al menos un cobro desde el bot y volvé a correr esto.");
    return;
  }

  // ── 1. El rename se ve en los datos reales ──────────────────────────────
  titulo("1. RENOMBRE FER → MARIAN (contra datos reales)");
  const valoresSocia = new Set();
  for (const c of Cobro) [c.registradoPor, c.cobradoPor].forEach((v) => v && valoresSocia.add(v));
  for (const p of Pago) [p.registradoPor, p.asignadoA].forEach((v) => v && valoresSocia.add(v));
  for (const b of Balance) b.transaccion && b.transaccion.realizadoPor && valoresSocia.add(b.transaccion.realizadoPor);

  const invalidos = [...valoresSocia].filter((v) => !SOCIAS_VALIDAS.has(v));
  info(`valores de socia encontrados: ${[...valoresSocia].join(", ") || "(ninguno)"}`);
  chequear(!invalidos.includes("Fer"), 'ningún documento dice "Fer"', `todavía hay documentos con "Fer": ${invalidos.join(", ")}`);
  if (invalidos.length && !invalidos.includes("Fer")) {
    aviso(`valores fuera del enum Socias (probablemente el first_name de Telegram): ${invalidos.join(", ")}`);
    aviso("En `registradoPor` de Pago eso es esperado: el wizard guarda el nombre de Telegram, no el enum.");
  }

  // ── 2. Cada Cobro/Pago generó su Balance ────────────────────────────────
  titulo("2. PIPELINE Cobro/Pago → Balance");
  const uidsEnBalance = new Set(Balance.map((b) => b.transaccion && b.transaccion.uid).filter(Boolean));
  const cobrosSinBalance = Cobro.filter((c) => !uidsEnBalance.has(c.uid));
  const pagosSinBalance = Pago.filter((p) => !uidsEnBalance.has(p.uid));
  chequear(cobrosSinBalance.length === 0, `los ${Cobro.length} Cobros tienen su Balance`, `${cobrosSinBalance.length} Cobros SIN Balance: ${cobrosSinBalance.map((c) => c.uid).join(", ")}`);
  chequear(pagosSinBalance.length === 0, `los ${Pago.length} Pagos tienen su Balance`, `${pagosSinBalance.length} Pagos SIN Balance: ${pagosSinBalance.map((p) => p.uid).join(", ")}`);

  // ── 3. Las cuentas de cada Resumen ──────────────────────────────────────
  titulo("3. LAS CUENTAS DE CADA RESUMEN");
  if (!Resumen.length) {
    mal("no hay ni un Resumen — el trigger onBalanceCreated no corrió");
    fallas++;
  }
  for (const r of Resumen) {
    console.log(`\n  \x1b[1m${r.uid}\x1b[0m  (mes ${r.mes} 0-indexado = ${r.mes + 1}, año ${r.year})`);

    const desde = new Date(r.year, r.mes, 1);
    const hasta = new Date(r.year, r.mes + 1, 1);
    const enMes = (v) => {
      const d = aFecha(v);
      return d && d >= desde && d < hasta;
    };
    const cobrosMes = Cobro.filter((c) => enMes(c.fechaCobro));
    const pagosMes = Pago.filter((p) => enMes(p.dateCreated));

    const sumaCobros = cobrosMes.reduce((a, c) => a + (c.monto || 0), 0);
    const sumaPagos = pagosMes.filter((p) => !p.esSaldo).reduce((a, p) => a + (p.monto || 0), 0);

    chequear(r.totalCobrado === sumaCobros, `totalCobrado ${r.totalCobrado} = suma de los ${cobrosMes.length} Cobros del mes`, `totalCobrado ${r.totalCobrado} ≠ suma real ${sumaCobros} (${cobrosMes.length} Cobros)`);
    chequear(r.totalPagado === sumaPagos, `totalPagado ${r.totalPagado} = suma de los Pagos del mes`, `totalPagado ${r.totalPagado} ≠ suma real ${sumaPagos}`);
    chequear(r.cantidadDeCobros === cobrosMes.length, `cantidadDeCobros ${r.cantidadDeCobros} coincide`, `cantidadDeCobros ${r.cantidadDeCobros} ≠ ${cobrosMes.length} reales`);

    const porSocia = (r.totalCobradoPorFer || 0) + (r.totalCobradoPorFlor || 0);
    chequear(porSocia === r.totalCobrado, `totalCobradoPorFer(=Marian) ${r.totalCobradoPorFer} + PorFlor ${r.totalCobradoPorFlor} = totalCobrado`, `la partición por socia da ${porSocia} y totalCobrado es ${r.totalCobrado}`);
    chequear(r.correspondeACadaSocia === r.totalCobrado / 2, `correspondeACadaSocia ${r.correspondeACadaSocia} = totalCobrado/2`, `correspondeACadaSocia ${r.correspondeACadaSocia} ≠ ${r.totalCobrado / 2}`);

    info(`deuda: Marian→Flor ${r.ferDebeAFlor}  ·  Flor→Marian ${r.florDebeAFer}  ·  saldado=${r.saldado}`);

    // ── El punto crítico: la prueba del fix 5.1 ──
    if (r.saldado === true) {
      const cobrosAbiertos = cobrosMes.filter((c) => c.estaDividido !== true);
      const pagosAbiertos = pagosMes.filter((p) => !p.esSaldo && p.dividieronLaPlata !== true);
      chequear(cobrosAbiertos.length === 0, `\x1b[1mPRUEBA 5.1\x1b[0m: los ${cobrosMes.length} Cobros del mes quedaron saldados`, `\x1b[1mPRUEBA 5.1 FALLA\x1b[0m: ${cobrosAbiertos.length} Cobros sin saldar pese a Resumen.saldado=true → la escritura del trigger se perdió: ${cobrosAbiertos.map((c) => c.uid).join(", ")}`);
      chequear(pagosAbiertos.length === 0, `los ${pagosMes.filter((p) => !p.esSaldo).length} Pagos del mes quedaron saldados`, `${pagosAbiertos.length} Pagos sin saldar: ${pagosAbiertos.map((p) => p.uid).join(", ")}`);

      const saldosSinFlag = pagosMes.filter((p) => p.esSaldo && p.dividieronLaPlata === undefined);
      if (saldosSinFlag.length) {
        aviso(`${saldosSinFlag.length} Pago(s) de tipo saldo sin \`dividieronLaPlata\` — ESPERADO, no es una falla:`);
        aviso("  pagosFactory no setea el flag en un saldo, y saldarPagosDeMes filtra por `== false`.");
        aviso("  Un pago de saldo no se salda a sí mismo. Anotado como D16 en roadmap.md.");
      }
    } else {
      info("resumen no saldado todavía → la prueba del fix 5.1 corre después de SALDAR DEUDA");
    }
  }

  // ── 4. Quién registró cada saldo ────────────────────────────────────────
  const saldos = Pago.filter((p) => p.esSaldo);
  if (saldos.length) {
    titulo("4. SALDOS — ¿quién quedó registrado como pagador? (prueba del fix S4)");
    for (const s of saldos) console.log(`  ${String(s.monto).padStart(8)}  registradoPor=${s.registradoPor}  uid=${s.uid}`);
    const distintos = new Set(saldos.map((s) => s.registradoPor));
    if (saldos.length >= 2 && distintos.size === 1) {
      aviso(`los ${saldos.length} saldos quedaron a nombre de "${[...distintos][0]}".`);
      aviso("Si los registraron socias distintas, esto es el bug del hardcodeo y NO se arregló.");
      aviso("Si siempre saldó la misma socia, es correcto.");
    } else if (saldos.length >= 2) {
      ok(`los saldos quedaron repartidos entre ${[...distintos].join(" y ")} — el hardcodeo está arreglado`);
    }
  }

  // ── 5. Choices ──────────────────────────────────────────────────────────
  titulo("5. CONFIGURACIÓN");
  const campos = docs.Choices.find((d) => d.id === "camposCliente");
  chequear(!!campos, `Choices/camposCliente presente: ${JSON.stringify(campos && { ...campos, id: undefined })}`, "falta Choices/camposCliente — corré `node functions/scripts/doctor.cjs seed`");
}

// ──────────────────────────────────────────────────────────────────── main ──
(async () => {
  const cmd = process.argv[2];
  const comandos = { preflight, webhook, seed, estado, vaciar };
  if (!comandos[cmd]) {
    console.log(`
SayCheeseBot doctor — verificación instrumentada

  node functions/scripts/doctor.cjs preflight        antes de desplegar
  node functions/scripts/doctor.cjs vaciar            dry-run: cuenta docs de las 7 colecciones, no borra
  node functions/scripts/doctor.cjs vaciar --confirmar   borra TODO de producción — sin vuelta atrás
  node functions/scripts/doctor.cjs webhook          después de registrar el webhook
  node functions/scripts/doctor.cjs seed             re-sembrar Choices/camposCliente + Cliente base
  node functions/scripts/doctor.cjs estado           después de usar el bot: verifica las cuentas

Requiere Node 22 (nvm use 22) y ADC (gcloud auth application-default login).
`);
    process.exit(1);
  }

  await comandos[cmd]();

  titulo("RESULTADO");
  if (fallas === 0) {
    console.log("  \x1b[32m✓ sin fallas\x1b[0m\n");
    process.exit(0);
  }
  console.log(`  \x1b[31m✗ ${fallas} chequeo(s) fallaron\x1b[0m\n`);
  process.exit(1);
})().catch((e) => {
  console.error("\nERROR:", e.message);
  if (/credential|authenticate|PERMISSION/i.test(e.message)) {
    console.error("→ Probá: gcloud auth application-default login\n");
  }
  process.exit(1);
});
