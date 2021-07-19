import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {botonesVueltaAtras} from "../general";

const textoSiHayDeuda = `Acá van a poder saldar sus deudas 🤑 . 
    
Podés solo pagar una parte de lo que le de debes a tu socia, o todo. 
    
👇*Presiona comenzar para continuar*👇`;

const textoSiNoHayDeuda = "*SORPRESA! Sus cuentas están saldadas!!* 🎉 Felicitaciones!! 🎉  ";

export const menu = new MenuTemplate<ExtendedContext>(async (ctx) => {
  const text = ctx.session.datosSaldo?.montoAdeudado == 0 ? textoSiNoHayDeuda : textoSiHayDeuda;
  return {text, parse_mode: "Markdown"};
});

menu.interact(
  "Comenzar",
  "nuevo",
  {
    do: (ctx) => {
      ctx.answerCbQuery("Saldar deuda");
      ctx.scene.enter("saldar-deuda-wizard");
      return false;
    },
    hide: (ctx) => ctx.session.datosSaldo?.montoAdeudado == 0,
  });

menu.manualRow(botonesVueltaAtras);
