import {MenuTemplate} from "telegraf-inline-menu";
import {ExtendedContext} from "../../../../config/context/myContext";
import {responderCallback} from "../../../modules/utils/replies";
import {ClienteFirestore} from "../../../modules/models/cliente";
import {Session} from "../../../modules/models/session";
import {getDatosCliente} from "../../../services/cliente-service";
import {editarPropiedadCliente} from "../../actions/cliente-actions";
import {obtenerCamposCliente} from "../choices";
import {botonesVueltaAtras} from "../general";


export const menu = new MenuTemplate<ExtendedContext>(async (ctx) => {
  const cliente: ClienteFirestore = await getDatosCliente(ctx.match![1]);
  let session: Session = await ctx.session;
  if (ctx.callbackQuery && ctx.callbackQuery.message && "message_id" in ctx.callbackQuery.message) {
    session = {
      ...session,
      edicionInformacionCliente: {
        cliente: cliente,
        mensajeInicial: ctx.callbackQuery.message.message_id,
      },
    };
    ctx.session = session;
  }

  const {nombre, telefono} = cliente;
  return `Esta es la información de ${cliente.nombre}: 
      - Nombre: ${nombre}
      - Telefono: ${telefono}
      ¿Qué campo te gustaría modificar?`;
});

menu.choose("campo", obtenerCamposCliente, {
  do: async (ctx, propiedadAEditar) => {
    await responderCallback(ctx, "Editar campo cliente");
    await editarPropiedadCliente(ctx, propiedadAEditar);
    return false;
  },
  columns: 2,
});


menu.manualRow(botonesVueltaAtras);
