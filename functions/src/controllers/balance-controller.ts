import {EventContext} from "firebase-functions";
import functions = require("firebase-functions");
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {CollectionName} from "../modules/enums/collectionName";
import {TipoImpresionEnConsola} from "../modules/enums/tipoImpresionEnConsola";
import {BalanceFirestore} from "../modules/models/balance";
import {imprimirEnConsola} from "../modules/utils/general";
import {mandarAlResumen} from "../services/resumen-service";

export const onBalanceCreated = functions.firestore
  .document(`${CollectionName.BALANCE}/{balanceUID}`)
  .onCreate((snap: DocumentSnapshot, context: EventContext) => {
    const balance = snap.data() as BalanceFirestore;
    imprimirEnConsola("On Balance created", TipoImpresionEnConsola.DEBUG, {balance});
    return mandarAlResumen(balance);
  });
