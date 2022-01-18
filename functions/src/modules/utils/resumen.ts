
/**
 * Para facililtar la obtención del resumen teniendo a nuestro alcance el mes y año del mismo, generamos su uid
 *
 * @param {number} mesDelResumen
 * @param {string} anoDelResumen
 * @return { Array<any> } botones del tipo Markup.button.callback con la información para incluir en el teclado
 */
export const generarResumenMensualUID = ( mesDelResumen: number, anoDelResumen: string) => {
  const resumenUID = `${mesDelResumen}_${anoDelResumen}_mensual`;
  return resumenUID;
};
