import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../config/context/myContext";
import {menu as submenuClientes} from "./clientes/index";
import {menu as submenuCobros} from "./cobros/index";
import {menu as submenuPagos} from "./pagos/index";
import {menu as submenuResumen} from "./resumen/generarResumen";

export const menu = new MenuTemplate<ExtendedContext>((ctx) => `Hola ${ctx.message ? ctx.message?.from.first_name : ctx.callbackQuery!.from.first_name} ¿Cómo puedo ayudarte?`);


menu.submenu("COBROS", "cobros", submenuCobros);
menu.submenu("PAGOS", "pagos", submenuPagos);
menu.submenu("CLIENTES", "clientes", submenuClientes);
menu.submenu("GENERAR RESUMEN", "resumen", submenuResumen, {joinLastRow: true});
