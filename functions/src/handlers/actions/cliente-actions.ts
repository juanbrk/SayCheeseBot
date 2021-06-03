import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesCliente} from "../../modules/enums/cliente";
import {MyWizardSession, Session} from "../../modules/models/session";
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
  const {session} = ctx.scene;
  if (ctx.message && session.datosCliente) {
    const ingresoNombre = session.datosCliente.nombre && !session.datosCliente.telefono;
    const ingresoTelefono = session.datosCliente.telefono;

    if (ingresoNombre && session.datosCliente && "text" in ctx.message) {
      return guardarPropiedadCliente(ctx, session, PropiedadesCliente.NOMBRE);
    } else if (
      ingresoTelefono &&
      ctx.scene.session.datosCliente &&
      "text" in ctx.message
    ) {
      const esNumeroTelefonico = regexCelular.test(ctx.message.text) || regexFijo.test(ctx.message.text);
      if (esNumeroTelefonico) {
        guardarPropiedadCliente(ctx, session, PropiedadesCliente.TELEFONO);
        return ctx.reply("Telefono guardado correctamente");
      } else {
        delete ctx.scene.session.datosCliente.telefono;
        await ctx.reply("El número ingresado no es válido. Al escribir un numero de telefono, podés hacerlo con o sin código de area y con el signo + al principio. Mirá estos ejemplos:\n  - +543513525590\n - 3513525590\n - 408725");
        await ctx.reply("Ingresa nuevamente el numero telefónico:");
        return;
      }
    }
  } else {
    if (ctx.callbackQuery && session.datosCliente && "from" in ctx.callbackQuery) {
      const {nombre: nombreCliente, telefono: telefonoCliente} = session.datosCliente;
      const datosDelCliente =
          "\n- Nombre: " + nombreCliente + "\n- Telefono: " + telefonoCliente;
      await ctx.editMessageText(`Guardando cliente con los siguientes datos: ${datosDelCliente}`);
      return guardarCliente(ctx, AccionesCliente.REGISTRO);
    }
  }
  return;
}

/**
 * Al gestionar clientes, el usuario puede registrar o modificar un cliente existente y tenemos que
 * guardar los cambios en la base de datos.
 * @param {ExtendedContext} ctx
 * @param {AccionesCliente} accion tipo de accion realizada sobre el cliente. Puede ser registro o edicion de los datos
 * @param {Cliente} cliente que debemos guardar
 */
export async function guardarCliente(ctx: ExtendedContext, accion: AccionesCliente) {
  if (accion == AccionesCliente.REGISTRO && ctx.scene.session.datosCliente) {
    const uid = ctx.scene.session.datosCliente.nombre?.replace(/ /g, "_").toLowerCase();

    const documentoCliente: ClienteFirestore = {
      nombre: `${ctx.scene.session.datosCliente.nombre}`,
      telefono: `${ctx.scene.session.datosCliente.telefono}`,
      registradoPor: `${ctx.callbackQuery!.from.first_name}`,
      uid: uid!,
    };

    const docRef = db.collection(CollectionName.CLIENTE).doc(`${uid}`);
    await docRef.set(documentoCliente);
    return ctx.reply(`${"Se creó correctamente el cliente"} ${documentoCliente.nombre}`);
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
 * Para registrar un nuevo cliente debemos hacerlo en pasos. Primero debemos obtener su nombre
 * y luego su telefono
 * @param {ExtendedContext} ctx
 * @param {Session} sessionActual la session con el cliente al que le falta la propiedad que vamos a guardar
 * @param {string} propiedadAGuardar propiedad que le agregaremos al cliente de la session
 *
 */
function guardarPropiedadCliente(ctx: ExtendedContext, sessionActual: MyWizardSession, propiedadAGuardar: string) {
  if (
    sessionActual.datosCliente &&
    (ctx.message && "text" in ctx.message)
  ) {
    switch (propiedadAGuardar) {
    case PropiedadesCliente.NOMBRE:
      sessionActual.datosCliente = {
        nombre: ctx.message.text,
        datosConfirmados: false,
      };
      break;
    case PropiedadesCliente.TELEFONO:
      sessionActual.datosCliente = {
        ...sessionActual.datosCliente,
        telefono: ctx.message.text,
      };
      break;
    default:
      break;
    }
  }
  ctx.scene.session.datosCliente = sessionActual.datosCliente;
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
