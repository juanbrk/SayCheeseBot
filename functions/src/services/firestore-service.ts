import admin = require("firebase-admin");
import Firestore = admin.firestore.Firestore;
import {TipoImpresionEnConsola} from "../modules/enums/tipoImpresionEnConsola";
import {SearchRequestDTO} from "../modules/models/DTOs/searchRequestDto";
import {imprimirEnConsola} from "../modules/utils/general";
import {CollectionName} from "../modules/enums/collectionName";

/**
 * Permite buscar y filtrar documentos en firestore. Segun lo pasado en la searchRequest, permite:
 *   - Agregar clausulas where
 *   - Ordenar el resultado por el campo especificado
 *
 * @param {Firestore} firestore
 * @param {SearchRequestDTO} searchRequest con los filtros deseados para la busqueda
 * @return {Promise<T[]>} los documentos que coinciden con los filtros de busqueda, con el tipado deseado
 */
export const buscarDocumentos = async <T>(
  firestore: Firestore,
  searchRequest: SearchRequestDTO
): Promise<T[]> => {
  imprimirEnConsola("Buscando documentos", TipoImpresionEnConsola.DEBUG, {collectionType: searchRequest.coleccion, filtros: searchRequest.filtros});

  let coleccionRef: any = firestore.collection(
    searchRequest.coleccion
  );

  if (searchRequest.filtros && searchRequest.filtros.length > 0) {
    for (const filter of searchRequest.filtros) {
      coleccionRef = coleccionRef.where(
        filter.fieldName,
        filter.queryOperator,
        filter.fieldValue
      );
    }
  }

  if (searchRequest.sortBy) {
    coleccionRef = coleccionRef.orderBy(
      searchRequest.sortBy.campo,
      searchRequest.sortBy.tipo
    );
  }

  const querySnapshot: any = await coleccionRef.get();
  return querySnapshot.docs.map((doc: any) => <T>doc.data());
};

/**
 * Cada vez que necesitamos actualizar un documento en firestore, le pasamos lo que queremos modificar o agregar y
 * se actualiza el documento en firestore
 *
 * @param {Firestore} firestore db
 * @param {CollectionType} tipoColeccion a la cual pertenece la entidad
 * @param {string} docUID UID del documento a actualizar
 * @param {any} cuerpo con la actualizacion del documento
 * @return {Promise<void>}
 */
export const actualizarEntidad = async <T>(
  firestore: Firestore,
  tipoColeccion: CollectionName,
  docUID: string,
  cuerpo: any
): Promise<any> => {
  imprimirEnConsola(
    "Actualizando entidad",
    TipoImpresionEnConsola.DEBUG,
    {
      coleccion: tipoColeccion,
      uid: docUID,
      cuerpoEntidad: cuerpo,
    }
  );
  return firestore
    .collection(tipoColeccion)
    .doc(docUID)
    .update(cuerpo);
};
