import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {obtenerResumenesSinSaldar} from "../../../services/resumen-service";
import {botonesVueltaAtras} from "../general";

const textoSiHayDeuda = `Acá van a poder saldar sus deudas 🤑 . 
    
Podés solo pagar una parte de lo que le de debes a tu socia, o todo. 
    
👇*Presiona comenzar para continuar*👇`;

const textoSiNoHayDeuda = "*SORPRESA! Sus cuentas están saldadas!!* 🎉 Felicitaciones!! 🎉  ";


export const menu = new MenuTemplate<ExtendedContext>(async (ctx) => {
  const resumenesSinSaldar = await obtenerResumenesSinSaldar();
  const text = resumenesSinSaldar.length == 0 ? textoSiNoHayDeuda : textoSiHayDeuda;
  return {text, parse_mode: "Markdown"};
});

/**
 * Si no hay deuda para saldar, no creamos ctx.session.datosSaldoTotal, porque después no hay manera de  eliminar esa
 * propiedad y siempre saldría como que hay deuda aun cuando no la hay
 */
menu.interact(
  "Comenzar",
  "nuevo",
  {
    do: async (ctx) => {
      await ctx.answerCbQuery("Saldar deuda total");
      const resumenesSinSaldar = await obtenerResumenesSinSaldar();
      const hayDeudaParaSaldar = resumenesSinSaldar.length > 0;
      if (hayDeudaParaSaldar) {
        ctx.session.datosSaldoTotal = {
          resumenesParaSaldar: resumenesSinSaldar,
        };
        await ctx.scene.enter("registrar-saldo-deuda-total-wizard");
      }

      return false;
    },
    hide: async (ctx) => {
      const resumenesSinSaldar = await obtenerResumenesSinSaldar();
      return resumenesSinSaldar.length == 0;
    },
  });

menu.manualRow(botonesVueltaAtras);
