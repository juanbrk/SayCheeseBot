
/**
 * Cuando se visualizan los cobros|pagos para un mes, se debe calcular el rango de fechas en el cual mostrar los
 * cobros, que corresponde a todo un mes.
 *
 * @param {string} indiceMes del mes seleccionado por el usuario
 * @return {any} con el rango de fechas de cobro|pago
 */
export function calcularMesInicialYFinal(indiceMes: string): { inicial: string; final: string } {
  const indiceNumerico = +indiceMes;
  let mesInicio = indiceMes;
  let mesFinal = `${indiceNumerico + 1}`;
  if (indiceNumerico < 10) {
    mesInicio = `0${indiceMes}`;
  }

  if (indiceNumerico + 1 < 10) {
    mesFinal = `0${indiceNumerico + 1}`;
  }

  if (indiceNumerico + 1 > 12) {
    mesFinal = "01";
  }

  return {
    inicial: mesInicio,
    final: mesFinal,
  };
}
