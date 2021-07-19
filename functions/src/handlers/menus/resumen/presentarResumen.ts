import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {armarResumen} from "../../actions/resumen-actions";
import {botonesVueltaAtras} from "../general";

import {menu as submenuSaldarMes} from "../saldos/saldarMesSeleccionado";

/**
 * Presentamos el resumen y la opción de saldar deudas.
 *
 * Dejamos en session el resumen seleccionado y eliminamos el listado de resumenes para no
 * amucharla
 */
export const menu = new MenuTemplate<ExtendedContext>(async (ctx) => {
  const textoResumen = await armarResumen(ctx, ctx.match![1]);
  delete ctx.session.resumenes;
  return {text: textoResumen, parse_mode: "HTML"};
});

menu.submenu("Saldar deuda", "saldar", submenuSaldarMes);
menu.manualRow(botonesVueltaAtras);
