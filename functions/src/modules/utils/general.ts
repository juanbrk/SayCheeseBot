import {TipoImpresionEnConsola} from "../enums/tipoImpresionEnConsola";
import functions = require("firebase-functions");

/**
 * Imprime en consola usando el Google logger SDK
 *
 * @param {string} mensaje texto a imprimir en consola
 * @param {TipoImpresionEnConsola} tipo del mensaje a imprimir
 * @param {any} data objeto a imprimir en consola
 * @return {any}
 */
export const imprimirEnConsola = (mensaje: string, tipo: TipoImpresionEnConsola, data?: any) => {
  switch (tipo) {
  case TipoImpresionEnConsola.DEBUG:
    return data ? functions.logger.debug(mensaje, {data}) : functions.logger.debug(mensaje);
  case TipoImpresionEnConsola.ERROR:
    return data ? functions.logger.error(mensaje, {data}) : functions.logger.error(mensaje);
  default:
    return data ? functions.logger.info(mensaje, {data}) : functions.logger.info(mensaje);
  }
};
