import {db} from "..";
import {CollectionName} from "../modules/enums/collectionName";
import {BalanceFirestore} from "../modules/models/balance";


/**
 * Ante cada cobro, debemos guardar un balance con lo que le corresponde cobrar a cada socia
 *
 *   - Para ambas socias, la entrada del balance corresponderá a la mitad del valor cobrado.
 *   - Para la socia que cobró el dinero, la entrada del balance será un valor positivo
 *   - Para la socia que no cobró el dinero, la entrada será un valor negativo
 *
 *  El balance corresponderá a un mes y año, para luego generar el resumen de los mismos
 *
 * @param {ExtendedContext} documentoDelBalance que se guardará en firestore
 * @param {Cliente} cliente que debemos guardar
 */
export async function registrarBalance(documentoDelBalance: BalanceFirestore) {
  const {uid} = documentoDelBalance;
  const docRef = db.collection(CollectionName.BALANCE).doc(`${uid}`);
  return docRef.set(documentoDelBalance);
}
