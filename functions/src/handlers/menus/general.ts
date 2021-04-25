import {createBackMainMenuButtons} from "telegraf-inline-menu";

import {ExtendedContext} from "../../../config/context/myContext";

export const botonesVueltaAtras = createBackMainMenuButtons<ExtendedContext>(
  (context) => "Volver 🔙",
  (context) => "Ir al menu principal"
);
