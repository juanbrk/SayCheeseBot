import {ExtendedContext} from "../../../config/context/myContext";
import {ClienteAsEntity, ClientesEntities} from "../../modules/models/cliente";
import {getCamposCliente} from "../../services/choices-service";
import {getClientesAsEntities} from "../../services/cliente-service";


/**
 *
 * @param {ExtendedContext} ctx asd
 * @return {Promise<Record<string, string>>} asd
 */
export async function obtenerListadoClientes(ctx: ExtendedContext): Promise<Record<string, string>> {
  const clientes: ClientesEntities = await getClientesAsEntities();
  const result: Record<string, string> = {};
  clientes.forEach((cliente: ClienteAsEntity) => {
    result[`${cliente.uid}`] = cliente.nombre;
  });
  return result;
}


/**
 *
 * @param {ExtendedContext} ctx asd
 * @return {Promise<Record<string, string>>} asd
 */
export async function obtenerCamposCliente(ctx: ExtendedContext): Promise<Record<string, string>> {
  const opciones: any = await getCamposCliente();
  const result: Record<string, string> = opciones;
  return result;
}
