import {Composer, Markup, Scenes} from "telegraf";
import {ExtendedContext} from "../../../../config/context/myContext";
import {Socias} from "../../enums/socias";
import {SaldoDeudaWizardSession} from "../../models/saldoDeuda";
import {avanzar, repetirPaso, solicitarIngresoMenu} from "../general";
import {procesarRegistroSaldo} from "../../../handlers/actions/saldo-actions";
import {regexMontoPagado} from "../../utils/regexs";

const seleccionarSocia = async (ctx: ExtendedContext) => {
  if (ctx.callbackQuery && ctx.session.datosSaldoMensual) {
    const datosSaldo: SaldoDeudaWizardSession = {
      ...ctx.session.datosSaldoMensual,
      datosConfirmados: false,
      registradoPor: `${ctx.callbackQuery.from.first_name}`,
    };

    await procesarRegistroSaldo(ctx, datosSaldo);
  }

  ctx.editMessageText(
    "¿Quien va a pagar?",
    Markup.inlineKeyboard([
      Markup.button.callback("Marian", "adeudaFer"),
      Markup.button.callback("Flor", "adeudaFlor"),
    ]));
  return avanzar(ctx);
};

/**
 * Valida el nombre ingresado y solicita el ingreso del telefono
 */
const validarSeleccionYChequearDeuda = new Composer<ExtendedContext>();
validarSeleccionYChequearDeuda.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
validarSeleccionYChequearDeuda.on("message", async (ctx: any) => {
  await ctx.reply("Por favor, selecciona una de las opciones. No entiendo si escribís.");
  await ctx.reply(
    "¿Quien va a pagar?",
    Markup.inlineKeyboard([
      Markup.button.callback("Marian", "adeudaFer"),
      Markup.button.callback("Flor", "adeudaFlor"),
    ]));
  return ctx.wizard.selectStep(1);
});

validarSeleccionYChequearDeuda.action("adeudaFer", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoDeuda) {
    // chequear si adeuda
    const datosSaldo: SaldoDeudaWizardSession = {
      ...ctx.scene.session.datosSaldoDeuda,
      asignadoA: Socias.MARIAN,
    };
    await procesarRegistroSaldo(ctx, datosSaldo);

    const laSociaSeleccionadaEsDeudora = datosSaldo.asignadoA == datosSaldo.sociaQueAdeuda;
    if (laSociaSeleccionadaEsDeudora) {
      const totalAdeudadoFormateado = new Intl.NumberFormat("de-DE").format(ctx.scene.session.datosSaldoDeuda.montoAdeudado);

      await ctx.editMessageText(
        `¿Querés pagar todo lo que le debés a Flor? (_Le debés $${totalAdeudadoFormateado}_)`, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{text: "No, pagar sólo una parte", callback_data: "saldarParcial"}],
              [{text: "Si, quiero pagar todo", callback_data: "saldarTotal"}],
            ],
          },
        });
    } else {
      // Si no adeuda solicitar seleccion socia
      await ctx.editMessageText(
        "De momento no tenés deudas, ¿Estás intentando registrar el pago de deuda de Flor? ",
        Markup.inlineKeyboard([
          Markup.button.callback("No, salir del registro", "salir"),
          Markup.button.callback("Si, me equivoqué!", "volverARegistrar"),
        ]));
    }
    return avanzar(ctx);
  }
});

validarSeleccionYChequearDeuda.action("adeudaFlor", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoDeuda) {
    // chequear si adeuda
    const datosSaldo: SaldoDeudaWizardSession = {
      ...ctx.scene.session.datosSaldoDeuda,
      asignadoA: Socias.FLOR,
    };

    await procesarRegistroSaldo(ctx, datosSaldo);
    const laSociaSeleccionadaEsDeudora = datosSaldo.asignadoA == datosSaldo.sociaQueAdeuda;

    if (laSociaSeleccionadaEsDeudora) {
      // si adeuda preguntar cuanto quiere pagar
      const totalAdeudadoFormateado = new Intl.NumberFormat("de-DE").format(ctx.scene.session.datosSaldoDeuda.montoAdeudado);
      await ctx.editMessageText(
        `¿Querés pagar todo lo que le debés a Marian? (_Le debés $${totalAdeudadoFormateado}_)`, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{text: "No, pagar sólo una parte", callback_data: "saldarParcial"}],
              [{text: "Si, quiero pagar todo", callback_data: "saldarTotal"}],
            ],
          },
        });
    } else {
      // Si no adeuda solicitar seleccion socia
      await ctx.editMessageText(
        "De momento no tenés deudas, ¿Estás intentando registrar el pago de deuda de Marian? ",
        Markup.inlineKeyboard([
          Markup.button.callback("No, salir del registro", "salir"),
          Markup.button.callback("Si, me equivoqué!", "volverARegistrar"),
        ]));
    }
    return avanzar(ctx);
  }
});

const validarSeleccionYSolicitarCuantoDeseaPagar = new Composer<ExtendedContext>();
validarSeleccionYSolicitarCuantoDeseaPagar.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

validarSeleccionYSolicitarCuantoDeseaPagar.action("saldarTotal", async (ctx) => {
  if (ctx.scene.session.datosSaldoDeuda) {
    const totalAdeudadoFormateado = new Intl.NumberFormat("de-DE").format(ctx.scene.session.datosSaldoDeuda.montoAdeudado);

    const datosSaldo: SaldoDeudaWizardSession = {
      ...ctx.scene.session.datosSaldoDeuda,
      monto: ctx.scene.session.datosSaldoDeuda.montoAdeudado,
    };

    await procesarRegistroSaldo(ctx, datosSaldo);
    await ctx.editMessageText(
      `💰 Vas a saldar tu deuda de $<b>${totalAdeudadoFormateado}</b>. Tu <b>Saldo restante</b> será $0 (Ya no vas a deber nada!)
      
      <b>¿Confirmas el pago?</b>`, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{text: "No, cambiar monto", callback_data: "reingresarMonto"}],
            [{text: "Si, registrar pago", callback_data: "registrarSaldo"}],
          ],
        },
      });
  }
  return ctx.wizard.selectStep(4);
});

validarSeleccionYSolicitarCuantoDeseaPagar.action("saldarParcial", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoDeuda) {
    // solicitar ingreso monto a saldar
    const totalAdeudadoFormateado = new Intl.NumberFormat("de-DE").format(ctx.scene.session.datosSaldoDeuda.montoAdeudado);
    ctx.editMessageText(`¿Cuanto vas a pagarle? (_Le debes $${totalAdeudadoFormateado}_)`, {parse_mode: "Markdown"});
  }
  return avanzar(ctx);
});

validarSeleccionYSolicitarCuantoDeseaPagar.action("volverARegistrar", async (ctx) => {
  await ctx.editMessageText(
    "¿Quien va a pagar?",
    Markup.inlineKeyboard([
      Markup.button.callback("Marian", "adeudaFer"),
      Markup.button.callback("Flor", "adeudaFlor"),
    ]));
  return ctx.wizard.selectStep(1);
});

validarSeleccionYSolicitarCuantoDeseaPagar.action("salir", async (ctx) => {
  await ctx.reply("No te preocupes, todos nos equivocamos. Te mando un gif para que te diviertas ☺️");
  await ctx.telegram.sendDocument(ctx.chat!.id, "https://media.giphy.com/media/3IUHDQBWX3l5Tl5Ht3/giphy.gif");
  return leaveScene(ctx);
});

const presentarMontoASaldarYSolicitarConfirmacion = new Composer<ExtendedContext>();
presentarMontoASaldarYSolicitarConfirmacion.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

presentarMontoASaldarYSolicitarConfirmacion.on("message", async (ctx: any)=> {
  const {text: montoIngresado} = ctx.message;
  const montoEsNumero = regexMontoPagado.test(`${montoIngresado}`);
  if (!montoEsNumero) {
    await ctx.reply("Por favor, ingresá nuevamente un monto válido");
    return repetirPaso(ctx);
  }

  const montoComoNumero: number = +`${montoIngresado}`.replace(",", ".");

  if (ctx.scene.session.datosSaldoDeuda) {
    const datosSaldo: SaldoDeudaWizardSession = {
      ...ctx.scene.session.datosSaldoDeuda,
      monto: montoComoNumero,
    };
    const seGuardaronLosDatos = await procesarRegistroSaldo(ctx, datosSaldo);

    if (!seGuardaronLosDatos) {
      await ctx.reply("Por favor, ingresá nuevamente un monto válido");
      return repetirPaso(ctx);
    }
  }

  const {saldoRestante} = ctx.scene.session.datosSaldoDeuda;
  const {montoAdeudado} = ctx.scene.session.datosSaldoDeuda;
  // TODO: Extraer metodo
  const saldoRestanteFormateado = new Intl.NumberFormat("de-DE").format(saldoRestante);
  const totalAdeudadoFormateado = new Intl.NumberFormat("de-DE").format(montoAdeudado);
  const montoIngresadoFormateado = new Intl.NumberFormat("de-DE").format(montoIngresado);

  if (saldoRestante > 0) {
    await ctx.reply(
      `💰 Vas a pagar $*${montoIngresadoFormateado}* de los $*${totalAdeudadoFormateado}* que debés. Tu *Saldo despues del pago* será: $${saldoRestanteFormateado}
      
      *¿Confirmas el pago?*`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{text: "No, cambiar monto", callback_data: "reingresarMonto"}],
            [{text: "Si, registrar pago", callback_data: "registrarSaldo"}],
          ],
        },
      });
  } else {
    await ctx.reply(
      `💰 Vas a saldar tu deuda de $<b>${totalAdeudadoFormateado}</b>. Tu <b>Saldo restante</b> será $0 (Ya no vas a deber nada!)

       <b>¿Confirmas el pago?</b>`, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{text: "No, cambiar monto", callback_data: "reingresarMonto"}],
            [{text: "Si, registrar pago", callback_data: "registrarSaldo"}],
          ],
        },
      });
  }
  return avanzar(ctx);
});


const chequearConfirmacionRegistrarSaldoYPresentarRestante = new Composer<ExtendedContext>();
chequearConfirmacionRegistrarSaldoYPresentarRestante.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

chequearConfirmacionRegistrarSaldoYPresentarRestante.action("reingresarMonto", async (ctx) => {
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoDeuda) {
    // solicitar ingreso monto a saldar
    delete ctx.scene.session.datosSaldoDeuda.monto;
    const totalAdeudadoFormateado = new Intl.NumberFormat("de-DE").format(ctx.scene.session.datosSaldoDeuda.montoAdeudado);
    ctx.editMessageText(`¿Cuanto vas a pagarle? (_Le debes $${totalAdeudadoFormateado}_)`, {parse_mode: "Markdown"});
  }
  return ctx.wizard.selectStep(3);
});


chequearConfirmacionRegistrarSaldoYPresentarRestante.action("registrarSaldo", async (ctx: any) => {
  if (ctx.callbackQuery && ctx.scene.session.datosSaldoDeuda) {
    const datosSaldo: SaldoDeudaWizardSession = {
      ...ctx.scene.session.datosSaldoDeuda,
      datosConfirmados: true,
    };
    await procesarRegistroSaldo(ctx, datosSaldo);
  }
  delete ctx.scene.session.datosSaldoDeuda;
  delete ctx.session.datosSaldo;
  solicitarIngresoMenu(ctx);
  return ctx.scene.leave();
});


// ! SIN USAR POR AHORA, SOLO SALDAREMOS DEUDAS TOTALES Y NO MENSUALES
export const wizardSaldarDeuda = new Scenes.WizardScene(
  "saldar-deuda-wizard",
  seleccionarSocia,
  validarSeleccionYChequearDeuda,
  validarSeleccionYSolicitarCuantoDeseaPagar,
  presentarMontoASaldarYSolicitarConfirmacion,
  chequearConfirmacionRegistrarSaldoYPresentarRestante
);

const leaveScene = async (ctx: ExtendedContext) => {
  await ctx.reply("Cancelaste el saldo de la deuda. No se guardo ningún cambio, la que debe sigue debiendo y la que adeuda se sigue haciendo la bobina");
  if (ctx.session.resumenes && ctx.session.datosSaldoMensual) {
    delete ctx.session.resumenes;
    delete ctx.session.datosSaldoMensual;
  }
  solicitarIngresoMenu(ctx);
  return ctx.scene.leave();
};

