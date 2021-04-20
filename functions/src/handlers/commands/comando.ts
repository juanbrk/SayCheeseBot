import {ExtendedContext} from "../../../config/context/myContext";
import {mostrarUsoDeInline} from "../../modules/utils/mensajes";

/**
 *
 * @param {ExtendedContext} ctx
 * @return {Promise}
 */
export async function ejemploCommand(ctx: ExtendedContext) {
  return mostrarUsoDeInline(ctx);
}
