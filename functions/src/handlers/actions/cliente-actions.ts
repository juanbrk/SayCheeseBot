import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesCliente} from "../../modules/enums/cliente";
import {Session} from "../../modules/models/session";
import {db} from "../../index";
import {ClienteFirestore} from "../../modules/models/cliente";

/**
 * Una vez que comenzó el registro del cliente, hay que continuar hasta que se hayan
 * obtenido todos los campos necesarios para registrarlo correctamente
 * @param {ExtendedContext} ctx
 * @return {Promise}
 */
export async function procesarRegistroCliente(ctx: ExtendedContext) {
  const {session} = ctx;
  if (ctx.message) {
    const ingresoNombre = ctx.message.message_id == session.nuevoCliente!.mensajeInicial + 1;
    const ingresoTelefono = ctx.message.message_id == session.nuevoCliente!.mensajeInicial + 3;
    if (ingresoNombre) {
      guardarPropiedadCliente(ctx, session, PropiedadesCliente.nombre);
      obtenerTelefonoCliente(ctx, session.nuevoCliente!.nombre!);
    } else if (ingresoTelefono && ctx.session.nuevoCliente) {
      guardarPropiedadCliente(ctx, session, PropiedadesCliente.telefono);
      // TODO: Confirmar datos mediante un submenu
      const datosDelCliente =
        "\n- Nombre: " + ctx.session.nuevoCliente.nombre + "\n- Telefono: " + ctx.session.nuevoCliente.telefono;
      await ctx.reply(`Guardando cliente con los siguientes datos: ${datosDelCliente}`);
      await guardarCliente(ctx);
      ctx.session.registrandoNuevoCliente = false;
    }
  } else {
    if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
      switch (ctx.callbackQuery.data) {
      case "/registrarNuevoCliente":
        return obtenerNombreCliente(ctx);
      default:
        break;
      }
    }
  }
  return;
}

/**
 * Antes de registrar los pagos, necesitamos dar de alta los clientes. Puede pasar que un cliente se haya
 * ingresado mal la primera vez y se necesite re-ingresar sus datos.
 * @param {ExtendedContext} ctx
 * @return {Promise}
 */
export async function obtenerNombreCliente(ctx: ExtendedContext): Promise<any> {
  const session = ctx.session;
  session.registrandoNuevoCliente = true;
  if (ctx.callbackQuery && "message" in ctx.callbackQuery) {
    session.nuevoCliente = {mensajeInicial: ctx.callbackQuery.message!.message_id};
  }
  ctx.session = session;
  return ctx.editMessageText("Ok. Por favor ingresá el nombre del nuevo cliente: ");
}


/**
 *
 * @param {ExtendedContext} ctx
 * @param {Cliente} cliente que debemos guardar
 */
export async function guardarCliente(ctx: ExtendedContext) {
  const coleccion = "Cliente";
  const uid = ctx.session.nuevoCliente!.nombre?.replace(/ /g, "_").toLowerCase();
  const docRef = db.collection(coleccion).doc(`${uid}`);
  const documentoCliente: ClienteFirestore= {
    nombre: `${ctx.session.nuevoCliente!.nombre}`,
    telefono: `${ctx.session.nuevoCliente!.telefono}`,
    registradoPor: `${ctx.message!.from.first_name}`,
    uid: uid!,
  };
  await docRef.set(documentoCliente);
  ctx.reply(`${"Se creó correctamente el cliente"} ${ctx.session.nuevoCliente!.nombre}`);
}

/**
 * El usuario ya ingresó el nombre del cliente, ahora tiene que ingresar el telefono
 * @param {ExtendedContext} ctx
 * @param {string} nombreCliente
 * @return {Promise}
 */
async function obtenerTelefonoCliente(ctx: ExtendedContext, nombreCliente: string) {
  return ctx.reply(`Ingresá ahora el telefono de ${nombreCliente}`);
}

/**
 * Para registrar un nuevo cliente debemos hacerlo en pasos. Primero debemos obtener su nombre
 * y luego su telefono
 * @param {ExtendedContext} ctx
 * @param {Session} sessionActual la session con el cliente al que le falta la propiedad que vamos a guardar
 * @param {string} propiedadAGuardar propiedad que le agregaremos al cliente de la session
 */
function guardarPropiedadCliente(ctx: ExtendedContext, sessionActual: Session, propiedadAGuardar: string) {
  if (sessionActual.nuevoCliente && (ctx.message && "text" in ctx.message)) {
    switch (propiedadAGuardar) {
    case PropiedadesCliente.nombre:
      sessionActual.nuevoCliente.nombre = ctx.message.text;
      break;
    case PropiedadesCliente.telefono:
      sessionActual.nuevoCliente.telefono = ctx.message.text;
      break;
    default:
      break;
    }
  }
  ctx.session = sessionActual;
}

