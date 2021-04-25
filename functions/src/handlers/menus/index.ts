import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../config/context/myContext";
import {menu as submenuClientes} from "./clientes/index";

export const menu = new MenuTemplate<ExtendedContext>((ctx) => `Hola ${ctx.message ? ctx.message?.from.first_name : ctx.callbackQuery!.from.first_name} ¿Cómo puedo ayudarte?`);

menu.submenu("Gestión de clientes", "clientes", submenuClientes);