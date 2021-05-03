import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesCliente} from "../../modules/enums/cliente";
import {Session} from "../../modules/models/session";
import {db} from "../../index";
import {ClienteFirestore} from "../../modules/models/cliente";
import {AccionesCliente} from "../../modules/enums/accionesCliente";
import {CollectionName} from "../../modules/enums/collectionName";


const regexCelular = /^(?:(?:00)?549?)?0?(?:11|[2368]\d)(?:(?=\d{0,2}15)\d{2})??\d{8}$/g;
const regexFijo = /^([+\d].*)?\d$/g;
/**
 * Una vez que comenzó el registro del cliente, hay que continuar hasta que se hayan
 * obtenido todos los campos necesarios para registrarlo correctamente
 * @param {ExtendedContext} ctx
 * @return {Promise}
 */
export async function procesarRegistroCliente(ctx: ExtendedContext) {
  const {session} = ctx;
  if (ctx.message && session.nuevoCliente) {
    const ingresoNombre = ctx.message.message_id == session.nuevoCliente.mensajeInicial + 1;
    const ingresoTelefono = ctx.message.message_id == session.nuevoCliente.mensajeInicial + 3;
    if (ingresoNombre && session.nuevoCliente && "text" in ctx.message) {
      await guardarPropiedadCliente(ctx, session, PropiedadesCliente.NOMBRE);
      obtenerTelefonoCliente(ctx, ctx.message.text);
    } else if (
      ingresoTelefono &&
      ctx.session.nuevoCliente &&
      ctx.session.nuevoCliente.cliente &&
      "text" in ctx.message
    ) {
      const esNumeroTelefonico = regexCelular.test(ctx.message.text) || regexFijo.test(ctx.message.text);
      if (esNumeroTelefonico) {
        guardarPropiedadCliente(ctx, session, PropiedadesCliente.TELEFONO);
        // TODO: Confirmar datos mediante un submenu
        const {nombre: nombreCliente, telefono: telefonoCliente} = ctx.session.nuevoCliente.cliente;
        const datosDelCliente =
          "\n- Nombre: " + nombreCliente + "\n- Telefono: " + telefonoCliente;
        await ctx.reply(`Guardando cliente con los siguientes datos: ${datosDelCliente}`);
        await guardarCliente(ctx, AccionesCliente.REGISTRO);
        delete ctx.session.nuevoCliente;
      } else {
        ctx.session.nuevoCliente.mensajeInicial = ctx.session.nuevoCliente.mensajeInicial+3;
        await ctx.reply("El número ingresado no es válido. Al escribir un numero de telefono, podés hacerlo con o sin código de area y con el signo + al principio. Mirá estos ejemplos:\n  - +543513525590\n - 3513525590\n - 408725");
        return ctx.reply("Ingresa nuevamente el numero telefónico:");
      }
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
  let session = ctx.session;
  if (ctx.callbackQuery && "message" in ctx.callbackQuery) {
    session = {
      ...session,
      nuevoCliente: {
        mensajeInicial: ctx.callbackQuery.message!.message_id,
      },
    };
  }
  ctx.session = await session;
  return ctx.editMessageText("Ok. Por favor ingresá el nombre del nuevo cliente: ");
}


/**
 * Al gestionar clientes, el usuario puede registrar o modificar un cliente existente y tenemos que
 * guardar los cambios en la base de datos.
 * @param {ExtendedContext} ctx
 * @param {AccionesCliente} accion tipo de accion realizada sobre el cliente. Puede ser registro o edicion de los datos
 * @param {Cliente} cliente que debemos guardar
 */
export async function guardarCliente(ctx: ExtendedContext, accion: AccionesCliente) {
  if (accion == AccionesCliente.REGISTRO && ctx.session.nuevoCliente && ctx.session.nuevoCliente.cliente) {
    const uid = ctx.session.nuevoCliente.cliente.nombre?.replace(/ /g, "_").toLowerCase();
    const docRef = db.collection(CollectionName.CLIENTE).doc(`${uid}`);
    const documentoCliente: ClienteFirestore = {
      nombre: `${ctx.session.nuevoCliente.cliente.nombre}`,
      telefono: `${ctx.session.nuevoCliente.cliente.telefono}`,
      registradoPor: `${ctx.message!.from.first_name}`,
      uid: uid!,
    };
    await docRef.set(documentoCliente);
    return ctx.reply(`${"Se creó correctamente el cliente"} ${ctx.session.nuevoCliente.cliente.nombre}`);
  } else {
    if (ctx.session.edicionInformacionCliente && "cliente" in ctx.session.edicionInformacionCliente) {
      const {cliente, propiedadAEditar, nuevoValor} = ctx.session.edicionInformacionCliente;
      const uid = cliente.uid;
      const docRef = db.collection(CollectionName.CLIENTE).doc(`${uid}`);
      switch (propiedadAEditar) {
      case PropiedadesCliente.NOMBRE:
        await docRef.update({nombre: nuevoValor});
        return ctx.reply(`Se actualizó correctamente el ${propiedadAEditar} del cliente ${nuevoValor}`);
      case PropiedadesCliente.TELEFONO:
        await docRef.update({telefono: nuevoValor});
        return ctx.reply(`Se actualizó correctamente el ${propiedadAEditar} del cliente ${cliente.nombre}`);
      default:
        break;
      }
    }
  }
  return;
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
async function guardarPropiedadCliente(ctx: ExtendedContext, sessionActual: Session, propiedadAGuardar: string) {
  if (
    sessionActual.nuevoCliente &&
    (ctx.message && "text" in ctx.message)
  ) {
    switch (propiedadAGuardar) {
    case PropiedadesCliente.NOMBRE:
      sessionActual.nuevoCliente = {
        ...sessionActual.nuevoCliente,
        cliente: {
          nombre: ctx.message.text,
        },
      };
      break;
    case PropiedadesCliente.TELEFONO:
      sessionActual.nuevoCliente = {
        ...sessionActual.nuevoCliente,
        cliente: {
          ...sessionActual.nuevoCliente.cliente,
          telefono: ctx.message.text,
        },
      };
      break;
    default:
      break;
    }
  }
  ctx.session = await sessionActual;
}


/**
 * Necesitamos poder darle al usuario la posibilidad de editar alguna propiedad del cliente
 * @param {ExtendedContext} ctx Actualización en progreso
 * @param {string} propiedadAEditar del cliente
 * @return {Promise}
 */
export async function editarPropiedadCliente(ctx: ExtendedContext, propiedadAEditar: string) {
  const session: Session = await ctx.session;
  if (session.edicionInformacionCliente && "cliente" in session.edicionInformacionCliente) {
    session.edicionInformacionCliente.propiedadAEditar = propiedadAEditar;
    const {cliente} = session.edicionInformacionCliente;
    ctx.session = session;
    return ctx.editMessageText(`Ingresá el nuevo ${propiedadAEditar} de ${cliente.nombre}`);
  }
  console.log("No hay un cliente en Session");
  return;
}


/**
 * Cuando el usuario decide editar la información de un cliente, debemos procesar la edición
 * según el campo del que se trate.
 * @param {ExtendedContext} ctx Actualización en proceso
 * @return {Promise<any>}
 */
export async function procesarEdicionDeCliente(ctx: ExtendedContext) {
  const {session} = ctx;
  if (ctx.session.edicionInformacionCliente && (ctx.message && "text" in ctx.message)) {
    const {mensajeInicial} = ctx.session.edicionInformacionCliente;
    const ingresoPropiedad = ctx.message.message_id == mensajeInicial + 1;
    if (ingresoPropiedad && session.edicionInformacionCliente && "propiedadAEditar" in session.edicionInformacionCliente) {
      const {propiedadAEditar, cliente} = session.edicionInformacionCliente;
      const nuevoValorPropiedad = ctx.message.text;
      switch (propiedadAEditar) {
      case PropiedadesCliente.NOMBRE:
        ctx.session.edicionInformacionCliente.nuevoValor = await nuevoValorPropiedad;
        await ctx.reply(`Guardando nuevo ${PropiedadesCliente.NOMBRE} para ${cliente.nombre}: ${nuevoValorPropiedad}`);
        await guardarCliente(ctx, AccionesCliente.EDICION);
        delete ctx.session.edicionInformacionCliente;
        break;
      case PropiedadesCliente.TELEFONO:
      {
        const esNumeroTelefonico = regexCelular.test(nuevoValorPropiedad) || regexFijo.test(nuevoValorPropiedad);
        if (esNumeroTelefonico) {
          ctx.session.edicionInformacionCliente.nuevoValor = await nuevoValorPropiedad;
          await ctx.reply(`Guardando nuevo ${PropiedadesCliente.TELEFONO} para ${cliente.nombre}: ${nuevoValorPropiedad}`);
          await guardarCliente(ctx, AccionesCliente.EDICION);
          delete ctx.session.edicionInformacionCliente;
          break;
        } else {
          ctx.session.edicionInformacionCliente.mensajeInicial = mensajeInicial+3;
          await ctx.reply("El número ingresado no es válido. Al escribir un numero de telefono, podés hacerlo con o sin código de area y con el signo + al principio. Mirá estos ejemplos:\n  - +543513525590\n - 3513525590\n - 408725");
          return ctx.reply("Ingresa nuevamente el numero telefónico:");
        }
      }
      default:
        break;
      }
    }
  }
  return;
}
