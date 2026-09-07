import functions = require("firebase-functions/v1");
import {CollectionName} from "../modules/enums/collectionName";
import {TipoImpresionEnConsola} from "../modules/enums/tipoImpresionEnConsola";
import {BalanceFirestore} from "../modules/models/balance";
import {imprimirEnConsola} from "../modules/utils/general";
import {mandarAlResumen} from "../services/resumen-service";

// El tipo del snapshot lo infiere el handler (QueryDocumentSnapshot). No se anota a
// mano ni se importa desde un subpath interno: el deep import a
// "firebase-functions/lib/providers/firestore" es justamente lo que se rompió al subir
// de v3 a v7.
export const onBalanceCreated = functions.firestore
  .document(`${CollectionName.BALANCE}/{balanceUID}`)
  .onCreate((snap) => {
    const balance = snap.data() as BalanceFirestore;
    imprimirEnConsola("On Balance created", TipoImpresionEnConsola.DEBUG, {balance});
    return mandarAlResumen(balance);
  });
