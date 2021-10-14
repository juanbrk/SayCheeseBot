import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerMesesEnLosQueHuboCobros} from "../choices";
import {botonesVueltaAtras} from "../general";

import {menu as submenuVisualizarCobros} from "./visualizarCobrosMes";


export const menu = new MenuTemplate<ExtendedContext>("Elegí el mes para ver los cobros realizados");
menu.chooseIntoSubmenu("mes", obtenerMesesEnLosQueHuboCobros, submenuVisualizarCobros, {
  columns: 2,
});


menu.manualRow(botonesVueltaAtras);
