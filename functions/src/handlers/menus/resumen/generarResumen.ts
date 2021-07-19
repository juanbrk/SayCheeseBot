import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerListadoResumenes} from "../choices";
import {botonesVueltaAtras} from "../general";

import {menu as submenuPresentarResumen} from "./presentarResumen";

export const menu = new MenuTemplate<ExtendedContext>("¿Para qué mes querés generar el resúmen?");

/**
 * El usuario necesita visualizar todos los meses para los que hubo cobros, para así realizar
 * un resúmen de los mismos.
 */
menu.chooseIntoSubmenu("mes", obtenerListadoResumenes, submenuPresentarResumen, {
  columns: 2,
});

menu.manualRow(botonesVueltaAtras);
