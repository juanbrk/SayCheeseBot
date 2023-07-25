import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿Con qué puedo ayudarte?");

menu.interact(
  "Registrar nuevo pago",
  "nuevo",
  {
    do: (ctx) => {
      ctx.answerCbQuery("Nuevo Pago");
      ctx.scene.enter("nuevo-pago-wizard");
      return false;
    },
  });
menu.interact(
  "Visualizar movimientos",
  "movimientosPagos",
  {
    do: (ctx) => {
      ctx.scene.enter("visualizar-movimientos-pagos-wizard");
      return false;
    },
  });
menu.manualRow(botonesVueltaAtras);
