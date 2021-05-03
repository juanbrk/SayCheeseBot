import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {getClienteEntity} from "../../../services/cliente-service";
import {botonesVueltaAtras} from "../general";

import {menu as submenuEditarCampos} from "./editardatosCliente";

export const menu = new MenuTemplate<ExtendedContext>(async (ctx) => {
  const cliente = await getClienteEntity(ctx.match![1]);
  return `Selecciona una opcion para ${cliente.nombre}`;
}
);

menu.submenu("Editar informacion", "editar", submenuEditarCampos);

menu.manualRow(botonesVueltaAtras);
