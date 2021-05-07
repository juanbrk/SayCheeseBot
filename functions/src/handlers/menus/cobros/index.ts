import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {botonesVueltaAtras} from "../general";
import {menu as submenuRegistrarCobro} from "./registrarCobro";
import {menu as submenuGenerarResumen} from "./generarResumen";

export const menu = new MenuTemplate<ExtendedContext>("¿Con qué puedo ayudarte?");

menu.submenu("Registrar nuevo cobro", "nuevo", submenuRegistrarCobro);
menu.submenu("Generar Resumen", "resumen", submenuGenerarResumen);
menu.manualRow(botonesVueltaAtras);
