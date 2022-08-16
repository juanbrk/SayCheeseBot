import functions = require("firebase-functions");
import {CollectionName} from "../modules/enums/collectionName";
import {ResumenFirestore} from "../modules/models/resumen";
import {tratarResumenAlterado} from "../services/resumen-service";

export const onResumenAlterado = functions.firestore
  .document(`${CollectionName.RESUMEN}/{resumenUID}`)
  .onUpdate(async (snap: any) => {
    const resumenAlterado: ResumenFirestore = snap.after.data();
    return tratarResumenAlterado(resumenAlterado);
  });
