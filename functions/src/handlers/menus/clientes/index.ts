import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {botonVueltaInicio} from "../general";

import {menu as submenuListarClientes} from "./listarClientes";

export const menu = new MenuTemplate<ExtendedContext>("¿Qué deseas hacer?");
// QUEDE ACA ARRIBA

menu.interact("Registrar nuevo cliente", "nuevo", {
  do: (ctx) => {
    ctx.answerCbQuery("Desea registrar cliente nuevo");
    ctx.scene.enter("super-wizard");
    return false;
  },
});

menu.submenu("Ver listado de clientes", "lista", submenuListarClientes);
menu.manualRow(botonVueltaInicio);


