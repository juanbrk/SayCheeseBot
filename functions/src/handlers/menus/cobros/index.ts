import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {botonesVueltaAtras} from "../general";
import {menu as submenuRegistrarCobro} from "./registrarCobro";

export const menu = new MenuTemplate<ExtendedContext>("¿Con qué puedo ayudarte?");

menu.submenu("Registrar nuevo cobro", "nuevo", submenuRegistrarCobro);
menu.interact(
  "Visualizar movimientos",
  "movimientos",
  {
    do: (ctx) => {
      ctx.scene.enter("visualizar-movimientos-wizard");
      return false;
    },
  });
menu.manualRow(botonesVueltaAtras);
