import {Firestore} from "firebase-admin/firestore";
import {CollectionName} from "../../enums/collectionName";

export interface ActualizarEntidadParams {
    firestore: Firestore;
    tipoColeccion: CollectionName;
    docUID: string;
    cuerpo: any;
}

export interface SaldarColeccionDeMesParams {
    firestore: Firestore;
    coleccion: CollectionName;
    /** Campo de fecha por el que filtrar (`fechaCobro` / `dateCreated`) */
    campoFecha: string;
    /** Campo booleano a poner en `true` (`estaDividido` / `dividieronLaPlata`) */
    campoDividido: string;
    /** 0-indexado, como lo devuelve `Date.getMonth()` */
    mes: number;
    year: number;
}
