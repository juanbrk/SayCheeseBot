import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {responderCallback} from "../../../modules/utils/replies";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>("¿Con qué puedo ayudarte?");

menu.interact(
  "Registrar nuevo pago",
  "nuevo",
  {
    do: async (ctx) => {
      await responderCallback(ctx, "Nuevo Pago");
      await ctx.scene.enter("nuevo-pago-wizard");
      return false;
    },
  });
menu.interact(
  "Visualizar movimientos",
  "movimientosPagos",
  {
    do: async (ctx) => {
      await ctx.scene.enter("visualizar-movimientos-pagos-wizard");
      return false;
    },
  });
menu.manualRow(botonesVueltaAtras);
