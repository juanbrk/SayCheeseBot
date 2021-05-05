import {db} from "..";
import {CollectionName} from "../modules/enums/collectionName";
import {BalanceFirestore} from "../modules/models/balance";

/**
 * Ante cada cobro, debemos guardar un balance con lo que le corresponde cobrar a cada socia
 *
 * @param {ExtendedContext} documentoDelBalance que se guardará en firestore
 * @param {Cliente} cliente que debemos guardar
 */
export async function registrarBalance(documentoDelBalance: BalanceFirestore) {
  const {uid} = documentoDelBalance;
  const docRef = db.collection(CollectionName.BALANCE).doc(`${uid}`);
  return docRef.set(documentoDelBalance);
}
