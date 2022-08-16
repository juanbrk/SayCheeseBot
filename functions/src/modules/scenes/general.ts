import {ExtendedContext} from "../../../config/context/myContext";
import {TipoImpresionEnConsola} from "../enums/tipoImpresionEnConsola";
import {imprimirEnConsola} from "../utils/general";

export const solicitarIngresoMenu = (ctx: ExtendedContext) => {
  ctx.reply("Ingresá /menu para ver las opciones");
};

export const avanzar = (ctx: ExtendedContext) => {
  ctx.wizard.next();
};

export const repetirPaso = (ctx: any) => {
  imprimirEnConsola("Repitiendo paso", TipoImpresionEnConsola.INFO);
  return;
};
