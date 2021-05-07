import {db} from "..";
import {CollectionName} from "../modules/enums/collectionName";
import {TipoResumen} from "../modules/enums/resumen";
import {actualizacionResumenFactory, resumenFactory} from "../modules/factories/resumenFactory";
import {BalanceFirestore} from "../modules/models/balance";
import {ResumenFirestore} from "../modules/models/resumen";

/**
 * Con cada cobro se genera un balance y, a partir de ese balance, se genera un nuevo resumen mensual o
 * se adiciona al existente, si es que ya hay uno creado, para asi llevar registro de lo cobrado durante un periodo
 *
 * @param {BalanceFirestore} documentoDelBalance A partir del cual se extrae el mes y el año para el resumen
 * @return {Promise}
 */
export async function mandarAlResumen(documentoDelBalance: BalanceFirestore): Promise<any> {
  const {mes: mesDelBalance, año: añoDelBalance} = documentoDelBalance;
  const resumenRef = db.collection(CollectionName.RESUMEN);
  const doc = await resumenRef.doc(`${mesDelBalance}_${añoDelBalance}_mensual`).get();
  let docDelResumen: ResumenFirestore;

  if (!doc.exists) {
    docDelResumen = await generarResumenMensual(
      mesDelBalance,
      añoDelBalance,
      documentoDelBalance
    );
    return guardarResumen(docDelResumen);
  } else {
    docDelResumen = doc.data() as ResumenFirestore;
    const resumenActualizado: ResumenFirestore= actualizacionResumenFactory(docDelResumen, documentoDelBalance);
    return guardarResumen(resumenActualizado);
  }
}

/**
 * Si no existen resumenes para un mes dado, se genera uno a partir de un balance para acumular los
 * ingresos de ese mes
 *
 * @param {number} mes
 * @param {number} año
 * @param {BalanceFirestore} documentoDelBalance
 * @return {ResumenFirestore} del tipo mensual
 */
const generarResumenMensual = async (
  mes: number,
  año: number,
  documentoDelBalance : BalanceFirestore,
) => {
  return resumenFactory(
    mes,
    año,
    TipoResumen.MENSUAL,
    documentoDelBalance,
  );
};

/**
 * Para llevar registro de cuanto se ha cobrado en un periodo de tiempo, necesitamos poder guardar
 * resumenes
 *
 * @param {ResumenFirestore} resumenAGuardar en firestore
 * @param {boolean} esActualizacion nos permite saber si crear o actualizar el documento en firestore
 * @return {Promise<FirebaseFirestore.WriteResult>}
 */
const guardarResumen = async (resumenAGuardar: ResumenFirestore, esActualizacion = false) => {
  const {uid} = resumenAGuardar;
  const docRef = db.collection(CollectionName.RESUMEN).doc(`${uid}`);
  if (!esActualizacion) {
    return docRef.set(resumenAGuardar);
  } else {
    return docRef.update(resumenAGuardar);
  }
};
