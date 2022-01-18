import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {TipoImpresionEnConsola} from "../../../modules/enums/tipoImpresionEnConsola";
import {imprimirEnConsola} from "../../../modules/utils/general";
import {obtenerListadoResumenes} from "../choices";
import {botonesVueltaAtras} from "../general";

import {menu as submenuPresentarResumen} from "./presentarResumen";

export const menu = new MenuTemplate<ExtendedContext>(async (ctx) => {
  ctx.session.visualizacionCobro = {anoSeleccionado: ctx.match![1]};
  imprimirEnConsola("Generando resumen -> eleccion año", TipoImpresionEnConsola.DEBUG, {anoElegido: ctx.match![1]});
  return "¿Para qué mes querés generar el resúmen?";
});

/**
 * El usuario necesita visualizar todos los meses para los que hubo cobros, para así realizar
 * un resúmen de los mismos.
 */
menu.chooseIntoSubmenu("mes", obtenerListadoResumenes, submenuPresentarResumen, {
  columns: 2,
});

menu.manualRow(botonesVueltaAtras);
