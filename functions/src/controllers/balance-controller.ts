import {EventContext} from "firebase-functions";
import functions = require("firebase-functions");
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {CollectionName} from "../modules/enums/collectionName";
import {BalanceFirestore} from "../modules/models/balance";
import {mandarAlResumen} from "../services/resumen-service";

export const onBalanceCreated = functions.firestore
  .document(`${CollectionName.BALANCE}/{balanceUID}`)
  .onCreate((snap: DocumentSnapshot, context: EventContext) => {
    const balance = snap.data() as BalanceFirestore;
    return mandarAlResumen(balance);
  });
