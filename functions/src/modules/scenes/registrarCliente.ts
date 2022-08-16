import {Composer, Markup, Scenes} from "telegraf";
import {ExtendedContext} from "../../../config/context/myContext";
import {procesarRegistroCliente} from "../../handlers/actions/cliente-actions";
import {avanzar, repetirPaso, solicitarIngresoMenu} from "./general";

const obtenerNombre = async (ctx: ExtendedContext) => {
  ctx.editMessageText("Ok. Por favor ingresá el nombre del nuevo cliente:");
  return avanzar(ctx);
};

/**
 * Valida el nombre ingresado y solicita el ingreso del telefono
 */
const obtenerTelefono = new Composer<ExtendedContext>();
obtenerTelefono.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));

obtenerTelefono.on("message", async (ctx: any) => {
  let {text: textoIngresado} = ctx.message;
  textoIngresado = textoIngresado.toLowerCase();
  if (textoIngresado.length < 2) {
    await ctx.reply("Por favor, ingresá nuevamente un nombre válido para el cliente");
    return repetirPaso(ctx);
  }
  ctx.scene.session.datosCliente = {nombre: textoIngresado};
  await procesarRegistroCliente(ctx);
  await ctx.reply(`Ingresá ahora el telefono de ${textoIngresado}`);
  return avanzar(ctx);
});
obtenerTelefono.command("siguiente", async (ctx) => {
  await ctx.reply("Siguiente");
  return avanzar(ctx);
});
obtenerTelefono.command("salir", async (ctx) => {
  await ctx.reply("Cancelaste el registro de un nuevo cliente");
  return await ctx.scene.leave();
});

/**
 * Valida el ingreso del telefono y solicita confirmación de datos.
 * Una vez que el usuario ingresó tanto el nombre como el teléfono, se le debe presentar la oportunidad
 * de confirmar si los datos ingresados son correctos, para guardar el nuevo cliente o recomenzar el
 * registro
 */
const confirmarDatos = new Composer<ExtendedContext>();
confirmarDatos.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
confirmarDatos.on("message", async (ctx: ExtendedContext) => {
  if (ctx.message && "text" in ctx.message && ctx.scene.session.datosCliente) {
    const {text: textoIngresado} = ctx.message;
    ctx.scene.session.datosCliente.telefono = textoIngresado;
    const registroCliente = await procesarRegistroCliente(ctx);
    if (!registroCliente) {
      // solicitar re ingreso datos
      return repetirPaso(ctx);
    }
    ctx.scene.session.datosCliente.datosConfirmados = true;
    const {datosCliente} = ctx.scene.session;
    ctx.reply(
      `Confirmá si los datos son correctos:
        - Nombre: ${datosCliente.nombre}
        - Telefono: ${datosCliente.telefono}`,
      Markup.inlineKeyboard([
        Markup.button.callback("Son incorrectos", "recomenzarRegistro"),
        Markup.button.callback("Están bien, registrar", "registrar"),
      ]));
    return avanzar(ctx);
  } else {
    solicitarIngresoMenu(ctx);
    return leaveScene(ctx);
  }
});

const guardarCliente = new Composer<ExtendedContext>();
guardarCliente.hears(["salir", "Salir", "cancelar", "Cancelar"], async (ctx) => leaveScene(ctx));
guardarCliente.action("registrar", async (ctx) => {
  const registroCliente = await procesarRegistroCliente(ctx);
  if (!registroCliente) {
    // ERROR RETORNAR AL PRINCIPIO
    await ctx.reply("Ocurrió un error. Por favor volvé a ingresar /menu para ver las opciones");
    return ctx.scene.leave();
  }
  solicitarIngresoMenu(ctx);
  return ctx.scene.leave();
});

guardarCliente.action("recomenzarRegistro", async (ctx: ExtendedContext) => {
  await ctx.answerCbQuery("Recomenzar registro");
  await ctx.editMessageText("Vamos de nuevo entonces");
  delete ctx.scene.session.datosCliente;
  await ctx.reply("Por favor ingresá el nombre del nuevo cliente:");
  return ctx.wizard.selectStep(1);
});


export const superWizard = new Scenes.WizardScene(
  "super-wizard",
  obtenerNombre,
  obtenerTelefono,
  confirmarDatos,
  guardarCliente,
);

const leaveScene = async (ctx: any) => {
  await ctx.reply("Cancelaste el registro de un nuevo cliente. Se borraron todos los datos.");
  
  delete ctx.scene.session.datosCliente;

  solicitarIngresoMenu(ctx);
  return ctx.scene.leave();
};

