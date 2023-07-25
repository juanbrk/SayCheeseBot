import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {TipoImpresionEnConsola} from "../../../modules/enums/tipoImpresionEnConsola";
import {imprimirEnConsola} from "../../../modules/utils/general";
import {obtenerAnosEnLosQueHuboMovimientos} from "../choices";
import {botonesVueltaAtras} from "../general";

import {menu as submenuSeleccionMes} from "./seleccionMes";

export const menu = new MenuTemplate<ExtendedContext>( async (ctx) => {
  imprimirEnConsola("Generar resumen", TipoImpresionEnConsola.DEBUG );
  return "¿Para qué año querés generar el resúmen?";
});

/**
 * El usuario necesita visualizar todos los años para los que hubo cobros, para así realizar
 * un resúmen de los mismos.
 */
menu.chooseIntoSubmenu("ano", obtenerAnosEnLosQueHuboMovimientos, submenuSeleccionMes, {
  columns: 2,
});

menu.manualRow(botonesVueltaAtras);
