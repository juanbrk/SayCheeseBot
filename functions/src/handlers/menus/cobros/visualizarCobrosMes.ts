import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {presentarCobrosMes} from "../../actions/cobro-actions";
import {botonesVueltaAtras} from "../general";

export const menu = new MenuTemplate<ExtendedContext>(async (ctx) => {
  const mesSeleccionado = `${+ctx.match![1] + 1}`; // agrega 1 al mes seleccionado y lo mantiene como string
  const textoResumen = await presentarCobrosMes(ctx, mesSeleccionado);
  return {text: textoResumen, parse_mode: "HTML"};
});


menu.manualRow(botonesVueltaAtras);
