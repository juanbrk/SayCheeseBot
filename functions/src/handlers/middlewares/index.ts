import {MiddlewareFn} from "telegraf";
import functions = require("firebase-functions/v1");
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
