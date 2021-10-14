import {ExtendedContext} from "../../../config/context/myContext";
import {ClienteAsEntity, ClientesEntities} from "../../modules/models/cliente";
import {ListadoResumenes, ResumenFirestore} from "../../modules/models/resumen";
import {getCamposCliente} from "../../services/choices-service";
import {getClientesAsEntities} from "../../services/cliente-service";
import {getResumenes} from "../../services/resumen-service";

export const MESES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

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
 * Necesitamos obtener los meses en los que se generaron resumenes para presentar en el submenu de
 * generar resumen
 *
 * @param {ExtendedContext} ctx Actualización en curso
 * @return {Promise<Record<string,string>>} opciones para los botones
 */
export async function obtenerListadoResumenes(ctx:ExtendedContext): Promise<Record<string, string>> {
  const resumenes: ListadoResumenes = await getResumenes();
  ctx.session = await {...ctx.session, resumenes: resumenes};
  const result: Record<string, string> = {};
  resumenes.forEach((resumen: ResumenFirestore) => {
    result[`${resumen.uid}`] = MESES[resumen.mes];
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

/**
 * A la hora de visualizar los cobros realizados, obtenemos los meses en los que se generaron resumenes (en teoría si se
 * generó un resumen, tiene que haberse generado un cobro) para mostrar los cobros realizados en ese mes.
 * @param {ExtendedContext} ctx context
 */
export async function obtenerMesesEnLosQueHuboCobros(ctx: ExtendedContext): Promise<Record<string, string>> {
  const resumenes: ListadoResumenes = await getResumenes();
  const result: Record<string, string> = {};
  resumenes.forEach((resumen: ResumenFirestore) => {
    result[`${resumen.mes}`] = MESES[resumen.mes];
  });
  return result;
}
