import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerNombreCliente} from "../../actions/cliente-actions";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿Querés registrar un nuevo cliente?");
menu.interact("Si, registrar nuevo cliente", "registrarNuevoCliente", {
  do: (ctx) => {
    ctx.answerCbQuery("Desea registrar cliente nuevo");
    obtenerNombreCliente(ctx);
    return false;
  },
});

menu.manualRow(botonesVueltaAtras);


