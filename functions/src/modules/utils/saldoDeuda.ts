import {saldarResumen, saldarResumenParcial} from "../../services/resumen-service";
import {Socias} from "../enums/socias";
import {ListadoResumenes, ResumenFirestore} from "../models/resumen";
import {encontrarResumenABalancear} from "./resumen";

/**
 * El saldo de la deuda parcial se hace de una manera sencilla,
 *   - Se toma un resumen de la deudora, donde la deuda sea mayor al saldo adeudado pendiente
 *   - En ese resumen, se le actualiza el valor que adeuda la socia para que coincida con el saldo adeudado pendiente
 *   - Para el resto de los resumenes, se salda la deuda.
 *
 * @param {ListadoResumenes} listadoResumenesASaldar
 * @param {Number} saldoAdeudadoPendiente es el saldo que aun adeuda la socia. la formula es
 *   # Saldo adeudado Pendiente = Monto Deuda Total - Monto Parcial a Saldar
 * @param {Socias} sociaDeudora la socia que adeuda y quien saldará parcialmente la deuda
 */
export const saldarDeudaParcial = async (
  listadoResumenesASaldar: ListadoResumenes,
  saldoAdeudadoPendiente: number,
  sociaDeudora: Socias
) => {
  const resumenDeDeudoraABalancear: ResumenFirestore = encontrarResumenABalancear(listadoResumenesASaldar, saldoAdeudadoPendiente, sociaDeudora);

  for (const resumenASaldar of listadoResumenesASaldar) {
    if (resumenASaldar.uid != resumenDeDeudoraABalancear.uid) {
      await saldarResumen(resumenASaldar);
    } else {
      await saldarResumenParcial(resumenASaldar, saldoAdeudadoPendiente, sociaDeudora);
    }
  }
};
