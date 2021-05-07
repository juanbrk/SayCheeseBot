import {TipoResumen} from "../enums/resumen";

export interface ResumenFirestore {
    mes: number;
    year: number;
    subTotalCobrado: number;
    totalCobrado: number;
    tipoResumen: TipoResumen;
    correspondeACadaSocia: number;
    ferDebeAFlor: number;
    florDebeAFer: number;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
    uid: string;
    cantidadDeCobros: number;
}
