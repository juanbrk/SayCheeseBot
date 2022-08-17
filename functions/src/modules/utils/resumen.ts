import {obtenerDatosExtracto} from "../../handlers/actions/resumen-actions";
import {Socias} from "../enums/socias";
import {ListadoResumenes, ResumenFirestore} from "../models/resumen";

/**
 * Para facililtar la obtención del resumen teniendo a nuestro alcance el mes y año del mismo, generamos su uid
 *
 * @param {number} mesDelResumen
 * @param {string} anoDelResumen
 * @return { string } botones del tipo Markup.button.callback con la información para incluir en el teclado
 */
export const generarResumenMensualUID = (mesDelResumen: number, anoDelResumen: string): string => {
  const resumenUID = `${mesDelResumen}_${anoDelResumen}_mensual`;
  return resumenUID;
};


/**
 * Dado un resumen, obtenemos la deudora del mismo.
 *
 * @param {ResumenFirestore} resumenASaldar
 * @return {Socias} que adeuda ese resumen
 */
export const encontrarDeudoraResumen = (resumenASaldar: ResumenFirestore): Socias => {
  const {ferDebeAFlor, florDebeAFer} = resumenASaldar;
  const montoAdeudadoPorFer = ferDebeAFlor - florDebeAFer;
  let deudoraDelResumen = Socias.FER;

  if (montoAdeudadoPorFer > 0) {
    deudoraDelResumen = Socias.FER;
  } else {
    deudoraDelResumen = Socias.FLOR;
  }

  return deudoraDelResumen;
};

export const calcularDeudaResumen = (resumenASaldar: ResumenFirestore) => {
  const {ferDebeAFlor, florDebeAFer} = resumenASaldar;
  const montoAdeudadoPorFer = ferDebeAFlor - florDebeAFer;
  const deudaDelResumen = Math.abs(montoAdeudadoPorFer);

  return deudaDelResumen;
};

/**
 * Se utiliza en el saldo parcial de deuda. Entre todos los resumenes que deben ser saldados, debemos buscar uno que
 * tenga una deuda mayor al monto ingresado. Este resumen será el que continuará teniendo deuda y el resto de los
 * resumenes será saldado.
 *
 * @param {ListadoResumenes} listadoResumenesASaldar Todos los resumenes que deben ser saldados
 * @param {number} saldoAdeudadoPendiente Monto pendiente luego de saldar parcialmente la deuda
 * @param {Socias} sociaDeudoraTotal Socia que adeuda
 * @return {ResumenFirestore} Resumen que será usado para saldar
 */
export const encontrarResumenABalancear = (listadoResumenesASaldar: ListadoResumenes, saldoAdeudadoPendiente: number, sociaDeudoraTotal: Socias): ResumenFirestore => {
  const resumenesPosiblesDeSaldar: ListadoResumenes = listadoResumenesASaldar.filter((resumenASaldar) => {
    const {ferDebeAFlor, florDebeAFer} = resumenASaldar;
    const deudoraDelResumen = encontrarDeudoraResumen(resumenASaldar);
    const montoAdeudadoPorFer = ferDebeAFlor - florDebeAFer;

    const deudaDelResumen = Math.abs(montoAdeudadoPorFer);
    return deudoraDelResumen == sociaDeudoraTotal && deudaDelResumen >= saldoAdeudadoPendiente;
  });

  resumenesPosiblesDeSaldar.sort((a, b) => b.year - a.year || b.mes - a.mes );

  return resumenesPosiblesDeSaldar[0];
};

/**
 * Al saldar la deuda que existe entre las socias, obtenemos quien de las dos es la que debe y cuanto debe.
 *
 * @param {ListadoResumenes} resumenesConDeuda resumenes que tienen deuda y a partir de los cuales calcular la deuda
 *
 * @return {any}
 */
export const obtenerDeudaFinal = (resumenesConDeuda: ListadoResumenes): any => {
  let montoAdeudaFer = 0;
  let montoAdeudaFlor = 0;

  let deudora = Socias.FER;
  let montoDeuda = 0;

  resumenesConDeuda.forEach((resumen: ResumenFirestore) => {
    const datosExtracto = obtenerDatosExtracto(resumen);

    if (datosExtracto.sociaQueDebe === Socias.FER) {
      montoAdeudaFer += datosExtracto.montoAdeudado;
    } else {
      montoAdeudaFlor += datosExtracto.montoAdeudado;
    }
  });

  deudora = montoAdeudaFlor > montoAdeudaFer ? Socias.FLOR : Socias.FER;
  montoDeuda = deudora === Socias.FER ? montoAdeudaFer - montoAdeudaFlor : montoAdeudaFlor - montoAdeudaFer;

  return {
    deudora,
    montoDeuda,
  };
};
