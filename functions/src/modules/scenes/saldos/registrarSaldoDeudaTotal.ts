import { Composer, Markup, Scenes } from "telegraf";
import { ExtendedContext } from "../../../../config/context/myContext";
import { ListadoResumenes } from "../../models/resumen";
import { avanzar, repetirPaso, solicitarIngresoMenu } from "../general";
import { obtenerDeudaFinal } from "../../utils/resumen";
import { armarMiniResumenSaldoDeuda } from "../../../handlers/actions/resumen-actions";
import { Socias } from "../../enums/socias";
import { obtenerResumenesSinSaldar, registrarSaldo, saldarResumen } from "../../../services/resumen-service";
import { regexMontoPagado } from "../../utils/regexs";
import { saldarDeudaParcial } from "../../utils/saldoDeuda";
import { imprimirEnConsola } from "../../utils/general";
import { TipoImpresionEnConsola } from "../../enums/tipoImpresionEnConsola";


// * Mostrar mini resumen y saldo
// * Solicitar pago
// * Salvo en el caso de que no haya deuda
const primerPaso = (ctx: ExtendedContext) => {
  let resumenesSinSaldar = {} as ListadoResumenes;
  let mensajeSaldoResumenes = `RESUMENES A SALDAR: 
  ---------------
  `;

  let cuerpoMensaje = "";
  if (ctx.session.datosSaldoTotal &&
    "resumenesParaSaldar" in ctx.session.datosSaldoTotal &&
    ctx.session.datosSaldoTotal.resumenesParaSaldar.length > 0
  ) {
    resumenesSinSaldar = ctx.session.datosSaldoTotal.resumenesParaSaldar;
    resumenesSinSaldar.forEach((resumen) => {
      cuerpoMensaje += armarMiniResumenSaldoDeuda(resumen);
    });

    const { deudora, montoDeuda } = obtenerDeudaFinal(resumenesSinSaldar);

    ctx.scene.session.datosSaldoTotalDeuda = {
      resumenesParaSaldar: resumenesSinSaldar,
      montoDeudaFinal: montoDeuda,
      deudora,
    };

    delete ctx.session.datosSaldoTotal;

    const sociaAdeudada = deudora == Socias.FER ? Socias.FLOR : Socias.FER;
    cuerpoMensaje += `---------------
  
    ✨ SALDO FINAL ✨
    -------------------
  
    💰 ${deudora} debe $${montoDeuda.toLocaleString("es-ar")} a ${sociaAdeudada}`;

    mensajeSaldoResumenes += cuerpoMensaje;
    ctx.editMessageText(
      mensajeSaldoResumenes,
      Markup.inlineKeyboard([
        Markup.button.callback("SALIR", "cancelar"),
        Markup.button.callback("SALDAR DEUDA", "saldarDeuda"),
      ]));


    return avanzar(ctx);
  } else {
    cuerpoMensaje = "🎉🎉  Sus cuentas están saldadas 💃. Nadie debe nada!! 🎉🎉 ";
    mensajeSaldoResumenes += cuerpoMensaje;

    ctx.reply(mensajeSaldoResumenes);
    ctx.reply("Nos vemos cuando deban algo de plata");

    solicitarIngresoMenu(ctx);
    return ctx.scene.leave();
  }
};

/**
 * *Valida la visualizacion deseada (mes/socia) y solicita ingresar el año para ver los cobros
 */
const segundoPaso = new Composer<ExtendedContext>();
segundoPaso.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
segundoPaso.on("message", async (ctx: any) => {
  return volverAlInicio(ctx);
});

// * solicitar pago total o parcial
segundoPaso.action("saldarDeuda", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoTotalDeuda) {
    const { montoDeudaFinal, deudora } = ctx.scene.session.datosSaldoTotalDeuda;
    const totalAdeudadoFormateado = montoDeudaFinal.toLocaleString("es-ar");
    const sociaAdeudada = deudora == Socias.FER ? Socias.FLOR : Socias.FER;

    await ctx.editMessageText(
      `¿Quieren saldar el total de la deuda? (_ ${deudora} le debe $${totalAdeudadoFormateado} a ${sociaAdeudada}_)`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "No, saldar sólo una parte", callback_data: "saldarParcial" }],
          [{ text: "Si, saldar todo", callback_data: "saldarTotal" }],
        ],
      },
    });
  }
  return avanzar(ctx);
});

segundoPaso.action("cancelar", async (ctx: ExtendedContext) => {
  return leaveScene(ctx);
});

// * Validación ingreso saldo parcial|total
const tercerPaso = new Composer<ExtendedContext>();
tercerPaso.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
tercerPaso.on("message", async (ctx: any) => {
  return volverAlInicio(ctx);
});

// * solicitar importe a pagar parcial
tercerPaso.action("saldarParcial", async (ctx) => {
  imprimirEnConsola("Saldando deuda parcial", TipoImpresionEnConsola.DEBUG);
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoTotalDeuda) {
    const { montoDeudaFinal, deudora } = ctx.scene.session.datosSaldoTotalDeuda;
    const totalAdeudadoFormateado = montoDeudaFinal.toLocaleString("es-ar");
    const sociaAdeudada = deudora == Socias.FER ? Socias.FLOR : Socias.FER;
    ctx.editMessageText(`¿Cuanta deuda van a saldar? (_ ${deudora} le debe $${totalAdeudadoFormateado} a ${sociaAdeudada}_)`, { parse_mode: "Markdown" });
  }
  return avanzar(ctx);
});

// * Solicitar confirmación pago total
tercerPaso.action("saldarTotal", async (ctx) => {
  imprimirEnConsola("Saldando deuda total", TipoImpresionEnConsola.DEBUG);
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoTotalDeuda) {
    const { montoDeudaFinal, deudora } = ctx.scene.session.datosSaldoTotalDeuda;
    const totalAdeudadoFormateado = montoDeudaFinal.toLocaleString("es-ar");
    const sociaAdeudada = deudora == Socias.FER ? Socias.FLOR : Socias.FER;
    ctx.scene.session.datosSaldoTotalDeuda.montoASaldar = montoDeudaFinal;

    ctx.editMessageText(
      `💰 Van a saldar  la TOTALIDAD de la deuda entre ustedes: ${deudora} debe $<b>${totalAdeudadoFormateado}</b> a ${sociaAdeudada}.
      
      Si confirman, las cuentas vuelven a cero y nadie le debe nada a nadie.
      
      <b>¿Confirmas el pago?</b>`, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "No, cambiar monto", callback_data: "reingresarMonto" }],
          [{ text: "Si, saldar deuda", callback_data: "registrarSaldo" }],
        ],
      },
    });
  }
  return ctx.wizard.selectStep(4);
});


// * Validar deuda parcial y presentar
const cuartoPaso = new Composer<ExtendedContext>();
cuartoPaso.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
cuartoPaso.on("message", async (ctx: any) => {
  if (ctx.message && ctx.scene.session.datosSaldoTotalDeuda) {
    imprimirEnConsola("Validando monto ingresado", TipoImpresionEnConsola.DEBUG, { montoIngresado: ctx.message });
    const { text: montoIngresado } = ctx.message;
    const { deudora, montoDeudaFinal } = ctx.scene.session.datosSaldoTotalDeuda;
    const montoIngresadoEsNumero = regexMontoPagado.test(`${montoIngresado}`);

    if (!montoIngresadoEsNumero) {
      await ctx.reply("Por favor, ingresá nuevamente un monto válido");
      return repetirPaso(ctx);
    }

    const montoIngresadoAsNumber: number = +`${montoIngresado}`.replace(",", ".");
    const totalAdeudadoFormateado = new Intl.NumberFormat("es-ar").format(montoDeudaFinal);

    if (montoIngresadoAsNumber > montoDeudaFinal) {
      await ctx.reply(`Por favor, ingresá un valor menor a $${totalAdeudadoFormateado}`);
      return repetirPaso(ctx);
    }
    const saldoRestante = montoDeudaFinal - montoIngresadoAsNumber;
    const montoIngresadoFormateado = new Intl.NumberFormat("es-AR").format(montoIngresado);
    const saldoRestanteFormateado = new Intl.NumberFormat("es-AR").format(saldoRestante);

    ctx.scene.session.datosSaldoTotalDeuda.montoASaldar = montoIngresadoAsNumber;

    await ctx.reply(
      `💰 Vas a pagar $*${montoIngresadoFormateado}* de los $*${totalAdeudadoFormateado}* que debés. Después del pago ${deudora} *continuará debiendo: $${saldoRestanteFormateado}*
    
    *¿Confirmas el pago?*`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "No, cambiar monto", callback_data: "reingresarMonto" }],
          [{ text: "Si, registrar pago", callback_data: "registrarSaldo" }],
        ],
      },
    });
    return avanzar(ctx);
  }
});

// * Registrar y Presentar el pago realizado
const quintoPaso = new Composer<ExtendedContext>();
quintoPaso.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
quintoPaso.on("message", async (ctx: any) => {
  return volverAlInicio(ctx);
});

// * Registrar saldo
quintoPaso.action("registrarSaldo", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoTotalDeuda) {
    imprimirEnConsola("Registrando saldo", TipoImpresionEnConsola.DEBUG, { datosSaldoTotal: ctx.scene.session.datosSaldoTotalDeuda });
    const { montoDeudaFinal, deudora, montoASaldar } = ctx.scene.session.datosSaldoTotalDeuda;
    const resumenesSinSaldar = await obtenerResumenesSinSaldar();

    const totalAdeudadoFormateado = new Intl.NumberFormat("es-AR").format(montoDeudaFinal);
    const sociaAdeudada = deudora == Socias.FER ? Socias.FLOR : Socias.FER;
    ctx.scene.session.datosSaldoTotalDeuda.registradoPor = ctx.callbackQuery.from.first_name;

    if (montoASaldar != undefined && montoASaldar < montoDeudaFinal) {
      const saldoRestante = montoDeudaFinal - montoASaldar;
      await ctx.reply(`Registrando el saldo parcial de la deuda entre ustedes ($${new Intl.NumberFormat("es-AR").format(montoASaldar)} de $${totalAdeudadoFormateado})`);
      await ctx.reply(`${deudora} seguirá debiendole a ${sociaAdeudada} $${saldoRestante.toLocaleString("es-ar")}`);
      await saldarDeudaParcial(resumenesSinSaldar, saldoRestante, deudora);
    } else {
      await ctx.reply("Registrando el saldo de la totalidad de la deuda entre ustedes. Sus cuentas quedarán en cero");

      for (const resumenASaldar of resumenesSinSaldar) {
        await saldarResumen(resumenASaldar);
      }
    }

    await registrarSaldo(ctx);
  }
  // * Salir
  const deudaSaldada = true;
  return leaveScene(ctx, deudaSaldada);
});

// * Solicitar re-elección de pago total|parcial
quintoPaso.action("reingresarMonto", async (ctx) => {
  imprimirEnConsola("Reingresar monto", TipoImpresionEnConsola.DEBUG);
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoTotalDeuda) {
    const { montoDeudaFinal, deudora } = ctx.scene.session.datosSaldoTotalDeuda;
    const totalAdeudadoFormateado = montoDeudaFinal.toLocaleString("es-ar");
    const sociaAdeudada = deudora == Socias.FER ? Socias.FLOR : Socias.FER;
    await ctx.reply(`¿Cuanta deuda van a saldar? (_ ${deudora} le debe $${totalAdeudadoFormateado} a ${sociaAdeudada}_)`, { parse_mode: "Markdown" });
  }
  return ctx.wizard.selectStep(3);
});


export const wizardSaldoDeudaTotal = new Scenes.WizardScene(
  "registrar-saldo-deuda-total-wizard",
  primerPaso,
  segundoPaso,
  tercerPaso,
  cuartoPaso,
  quintoPaso
);

const leaveScene = async (ctx: any, seSaldoLaDeuda = false) => {
  if (!seSaldoLaDeuda) {
    await ctx.reply("Cancelaste el saldo de la deuda. Asi nunca vamos a avanzar loco 😂😂.");
  }
  solicitarIngresoMenu(ctx);
  delete ctx.session.datosSaldoTotal;
  delete ctx.scene.session.datosSaldoTotalDeuda;
  return ctx.scene.leave();
};

/**
 * Cuando se recibe un update distinto al que debería recibirse, o sucede algún error, o debemos reiniciar el proceso
 * eliminamos la session y volvemos al primer paso del wizard.
 * @param {ExtendedContext} ctx context
 * @return {Promise<any>}
 */
const volverAlInicio = async (ctx: ExtendedContext): Promise<any> => {
  imprimirEnConsola("Volviendo al inicio", TipoImpresionEnConsola.DEBUG);
  await ctx.reply("Por favor, selecciona una de las opciones de abajo.  No entiendo si escribís.");
  ctx.reply(
    "¿Querés saldar la deuda o no? ",
    Markup.inlineKeyboard([
      Markup.button.callback("CANCELAR", "cancelar"),
      Markup.button.callback("SALDAR DEUDA", "saldarDeuda"),
    ]));
  return ctx.wizard.selectStep(1);
};


