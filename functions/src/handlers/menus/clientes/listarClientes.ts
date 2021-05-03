import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerListadoClientes} from "../choices";
import {botonesVueltaAtras} from "../general";

import {menu as submenuOpcionesCliente} from "./opcionesClienteSeleccionado";

export const menu = new MenuTemplate<ExtendedContext>("Estos son todos tus clientes. Selecciona uno para ver mas opciones.");

menu.chooseIntoSubmenu("id", obtenerListadoClientes, submenuOpcionesCliente, {
  columns: 2,
});
menu.manualRow(botonesVueltaAtras);
