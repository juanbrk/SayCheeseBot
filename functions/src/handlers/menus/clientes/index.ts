import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerNombreCliente} from "../../actions/cliente-actions";
import {botonVueltaInicio} from "../general";

import {menu as submenuListarClientes} from "./listarClientes";

export const menu = new MenuTemplate<ExtendedContext>("¿Qué deseas hacer?");

menu.interact("Registrar nuevo cliente", "nuevo", {
  do: (ctx) => {
    ctx.answerCbQuery("Desea registrar cliente nuevo");
    obtenerNombreCliente(ctx);
    return false;
  },
});

menu.submenu("Ver listado de clientes", "lista", submenuListarClientes);
menu.manualRow(botonVueltaInicio);


