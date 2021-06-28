import {ExtendedContext} from "../../../config/context/myContext";

export const solicitarIngresoMenu = (ctx: ExtendedContext) => {
  ctx.reply("Ingresá /menu para ver las opciones");
};

export const avanzar = (ctx: ExtendedContext) => {
  ctx.wizard.next();
};

export const repetirPaso = (ctx: any) => {
  return;
};
