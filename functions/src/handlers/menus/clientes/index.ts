import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {getCliente} from "../../../services/cliente-service";
import {obtenerNombreCliente} from "../../actions/cliente-actions";
import {obtenerListadoClientes} from "../choices";
import {botonesVueltaAtras, botonVueltaInicio} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿Qué deseas hacer?");
menu.interact("Registrar nuevo cliente", "registrarNuevoCliente", {
  do: (ctx) => {
    ctx.answerCbQuery("Desea registrar cliente nuevo");
    obtenerNombreCliente(ctx);
    return false;
  },
});

const submenuListarClientes = new MenuTemplate<ExtendedContext>("Estos son todos tus clientes. Selecciona uno para ver mas opciones.");


const submenuClienteSeleccionado = new MenuTemplate<ExtendedContext>(async (ctx) => {
  const cliente = await getCliente(ctx.match![1]);
  return `Selecciona una opcion para ${cliente.nombre}`;
}
);

/**
 * TODO: DOTAR A ESTOS BOTONES DE VIDA
 */
submenuClienteSeleccionado.interact("Editar información", "unique", {
  do: async (ctx) => {
    console.log("Take a look at ctx.match. It contains the chosen city", ctx.match);
    return ctx.answerCbQuery("You hit a button in a submenu");
  },
});
submenuClienteSeleccionado.interact("Registrar nuevo cobro", "uniqu", {
  do: async (ctx) => {
    console.log("Take a look at ctx.match. It contains the chosen city", ctx.match);
    return ctx.answerCbQuery("You hit a button in a submenu");
  },
});
submenuClienteSeleccionado.interact("Ver cobros realizados", "uniqe", {
  do: async (ctx) => {
    console.log("Take a look at ctx.match. It contains the chosen city", ctx.match);
    return ctx.answerCbQuery("You hit a button in a submenu");
  },

});
submenuClienteSeleccionado.interact("Dar de baja", "unirse", {
  do: async (ctx) => {
    console.log("Take a look at ctx.match. It contains the chosen city", ctx.match);
    return ctx.answerCbQuery("You hit a button in a submenu");
  },
  joinLastRow: true,
});
submenuClienteSeleccionado.manualRow(botonesVueltaAtras);


submenuListarClientes.chooseIntoSubmenu("cliente", obtenerListadoClientes, submenuClienteSeleccionado, {
  columns: 2,
});
submenuListarClientes.manualRow(botonesVueltaAtras);


menu.submenu("Ver listado de clientes", "listadoClientes", submenuListarClientes);
menu.manualRow(botonVueltaInicio);


