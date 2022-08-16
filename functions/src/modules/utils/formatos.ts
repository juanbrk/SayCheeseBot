
/**
* Muchas veces es necesario formatear los valores para ser expresadas como valor monetario ($x.xxx.xxx,xxx)
* Por eso usamos esta funcion
*
* @param {number} valorAFormatear que viene asi nomas, como numero sin nada mas
* @return {string} con el simbolo $, punto como separador de miles y coma como separador de decimales
*/
export const formatearValorComoDinero = (valorAFormatear: number): string => {
  return `$${(valorAFormatear).toLocaleString("es-ar")}`;
};
