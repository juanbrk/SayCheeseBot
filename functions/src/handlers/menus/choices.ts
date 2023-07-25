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
export async function obtenerListadoResumenes(ctx: ExtendedContext): Promise<Record<string, string>> {
  const anoSeleccionado: string | undefined = (ctx.session.visualizacionCobro && "anoSeleccionado" in ctx.session.visualizacionCobro) ?
    ctx.session.visualizacionCobro.anoSeleccionado :
    undefined;

  const ano: string = anoSeleccionado !== undefined ? anoSeleccionado : "2021";

  const resumenes: Record<string, string> = await obtenerMesesEnLosQueHuboMovimientos(ctx, ano);
  return resumenes;
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
 * A la hora de visualizar los cobros o pagos realizados, obtenemos los meses en los que se generaron resumenes (en teoría si se
 * generó un resumen, tiene que haberse generado un cobro|pago) para mostrar los movimientos realizados en ese mes.
 * @param {ExtendedContext} ctx context
 * @param {string} ano en el que se realizaron los cobros
 */
export async function obtenerMesesEnLosQueHuboMovimientos(ctx: ExtendedContext, ano: string): Promise<Record<string, string>> {
  const resumenes: ListadoResumenes = await getResumenes();
  const result: Record<string, string> = {};
  const anoNumerico: number = +ano;
  const resumenesDelAno: ListadoResumenes = resumenes.filter((resumen) => resumen.year === anoNumerico);
  resumenesDelAno.forEach((resumen: ResumenFirestore) => {
    result[`${resumen.mes}`] = MESES[resumen.mes];
  });
  return result;
}

/**
 * A la hora de visualizar los cobros realizados, obtenemos los años en los que se generaron resumenes (en teoría si se
 * generó un resumen, tiene que haberse generado un cobro) para mostrar los cobros realizados en ese año.
 *
 * @param {ExtendedContext} ctx context
 * @return {Promise<Record<string,string>>}
 */
export async function obtenerAnosEnLosQueHuboMovimientos(ctx: ExtendedContext): Promise<Record<string, string>> {
  const resumenes: ListadoResumenes = await getResumenes();
  const result: Record<string, string> = {};
  const anos: Array<number> = [];

  resumenes.filter((resumen: ResumenFirestore) => {
    if (anos.indexOf(resumen.year) < 0) {
      anos.push(resumen.year);
    }
  });

  anos.forEach((ano: number) => {
    result[`${ano}`] = `${ano}`;
  });
  return result;
}

/**
 * Necesitamos obtener las socias para mostrarlas en las opciones del menú
 * @param {ExtendedContext} ctx
 * @return {Record<string,string>}
 */
export function obtenerSocias(ctx: ExtendedContext): Record<string, string> {
  const records: Record<string, string> = {"FER": "Fer", "FLOR": "Flor"};
  return records;
}
