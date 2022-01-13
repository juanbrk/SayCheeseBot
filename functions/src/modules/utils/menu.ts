import {Markup} from "telegraf";

/**
 *
 * @param {Record<string, string>} datos Con el texto y el callback para incluir en cada botón
 * @return { Array<any> } botones del tipo Markup.button.callback con la información para incluir en el teclado
 */
export const generarBotonesCallback = ( datos: Record<string, string>) => {
  const botones: Array<any> = [];
  for (const dato in datos) {
    if (datos.hasOwnProperty(dato)) {
      botones.push(Markup.button.callback(datos[dato], dato));
    }
  }
  return botones;
};
