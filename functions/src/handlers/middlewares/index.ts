import {MiddlewareFn} from "telegraf";
import functions = require("firebase-functions/v1");
import {Timestamp} from "firebase-admin/firestore";
import {ExtendedContext} from "../../../config/context/myContext";

/**
 * Lee `TELEGRAM_ALLOWED_IDS` (coma-separado) una sola vez por instancia del bot.
 * Vacía o ausente ⇒ nadie pasa (fail-closed): más seguro que dejar el bot abierto
 * por una variable que se olvidó de cargar.
 */
function leerIdsPermitidos(): Set<number> {
  const crudo = process.env.TELEGRAM_ALLOWED_IDS ?? "";
  return new Set(
    crudo
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .map(Number)
  );
}

/**
 * Allowlist por `from.id`, primer middleware del bot —antes de la sesión y de
 * `stage.middleware()`—: hoy CUALQUIERA que le escriba a @estudiolata_bot puede
 * usarlo, y de acá salen los datos contables de Flor y Marian.
 *
 * Rechaza en silencio (sin `ctx.reply`): no hay razón para confirmarle a un
 * desconocido que el bot existe y está vivo.
 */
export function soloUsuariosPermitidos(): MiddlewareFn<ExtendedContext> {
  const permitidos = leerIdsPermitidos();
  return async (ctx, next) => {
    const id = ctx.from?.id;
    if (id !== undefined && permitidos.has(id)) {
      return next();
    }
    functions.logger.warn("[allowlist] acceso rechazado", {
      id,
      username: ctx.from?.username,
    });
    return undefined;
  };
}

const DIAS_DE_VIDA_SESION = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Pone `expiraEn` = ahora + 30 días en la sesión de cada update. Sin esto los
 * documentos de `sessions` no se borran nunca: un wizard abandonado queda
 * guardado para siempre.
 *
 * La política TTL de `firestore.indexes.json` borra los documentos cuyo
 * `expiraEn` ya pasó, así que una sesión que se usa se renueva sola y sólo
 * desaparecen las que llevan 30 días sin actividad. No agrega escrituras:
 * `telegraf-session-firestore` ya guarda la sesión completa en cada update.
 */
export function renovarVencimientoSesion(): MiddlewareFn<ExtendedContext> {
  return async (ctx, next) => {
    // Sin `from` o `chat` la librería no arma la clave y `ctx.session` no existe.
    if (ctx.session) {
      ctx.session.expiraEn = Timestamp.fromMillis(
        Date.now() + DIAS_DE_VIDA_SESION * MS_POR_DIA
      );
    }
    return next();
  };
}
