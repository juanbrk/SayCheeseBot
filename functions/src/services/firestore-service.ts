import {Firestore} from "firebase-admin/firestore";
import {TipoImpresionEnConsola} from "../modules/enums/tipoImpresionEnConsola";
import {SearchRequestDTO} from "../modules/models/DTOs/searchRequestDto";
import {imprimirEnConsola} from "../modules/utils/general";
import {CollectionName} from "../modules/enums/collectionName";
import {Filter} from "../modules/models/filter";
import {QueryOperators} from "../modules/enums/QueryOperators";

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

/**
 * Cuando se salda un Resumen, hay que marcar como saldados todos los documentos (Cobro o
 * Pago) del mes que todavía no lo estaban. `saldarCobrosDeMes` y `saldarPagosDeMes` hacían
 * exactamente este mismo cálculo de rango de fechas + búsqueda + actualización en paralelo,
 * con sólo el nombre de la colección y del campo booleano cambiando entre las dos.
 *
 * `mes` viene 0-indexado (sale de `Date.getMonth()`). La cota superior es exclusiva: el 1°
 * del mes siguiente — un día 31 a mano es inválido en febrero y en los meses de 30 días.
 *
 * @param {Firestore} firestore db
 * @param {CollectionName} coleccion COBRO o PAGO
 * @param {string} campoFecha nombre del campo de fecha por el que filtrar (`fechaCobro` / `dateCreated`)
 * @param {string} campoDividido nombre del campo booleano a poner en `true` (`estaDividido` / `dividieronLaPlata`)
 * @param {number} mes 0-indexado
 * @param {number} year
 * @return {Promise<void>}
 */
export const saldarColeccionDeMes = async <T extends {uid: string}>(
  firestore: Firestore,
  coleccion: CollectionName,
  campoFecha: string,
  campoDividido: string,
  mes: number,
  year: number
): Promise<void> => {
  const fechaInicioMes = new Date(year, mes, 1);
  const fechaFinalMes = new Date(year, mes + 1, 1);

  const searchRequest: SearchRequestDTO = {
    coleccion,
    filtros: [
      new Filter(campoFecha, QueryOperators.GTE, fechaInicioMes),
      new Filter(campoFecha, QueryOperators.LT, fechaFinalMes),
      new Filter(campoDividido, QueryOperators.EQ, false),
    ],
  };

  const documentosASaldar: T[] = await buscarDocumentos(firestore, searchRequest);

  // Con `await`: antes eran N promesas sueltas que podían perderse si la instancia se
  // congelaba a mitad de camino.
  await Promise.all(
    documentosASaldar.map((documento) => {
      (documento as any)[campoDividido] = true;
      return actualizarEntidad(firestore, coleccion, documento.uid, documento);
    })
  );
};
