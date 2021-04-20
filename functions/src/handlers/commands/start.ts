import {ExtendedContext} from "../../../config/context/myContext";
import {darLaBienvenida} from "../../modules/utils/mensajes";

/**
 *
 * @param {ExtendedContext} ctx
 * @param {boolean} sePresionoStart
 * @return {Promise}
 */
export async function startCommand(ctx: ExtendedContext, sePresionoStart: boolean) {
  return darLaBienvenida(ctx, sePresionoStart);
}
