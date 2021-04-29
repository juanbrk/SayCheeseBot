import {createBackMainMenuButtons} from "telegraf-inline-menu";

import {ExtendedContext} from "../../../config/context/myContext";

export const botonesVueltaAtras = createBackMainMenuButtons<ExtendedContext>(
  (context) => "🔙 Volver ",
  (context) => "⏮️ Ir al menu inicial"
);

/**
 * Solo genera el botón para volver al menú inicial, sin el botón para navegar un nivel en el arbol
 */
export const botonVueltaInicio = createBackMainMenuButtons<ExtendedContext>(
  undefined,
  (context) => "⏮️ Ir al menu inicial"
);
