import {TipoResumen} from "../enums/resumen";

export interface ResumenFirestore {
    mes: number;
    year: number;
    totalCobrado: number;
    totalPagado: number;
    totalCobradoPorFer: number;
    totalCobradoPorFlor: number;
    tipoResumen: TipoResumen;
    correspondeACadaSocia: number;
    ferDebeAFlor: number;
    florDebeAFer: number;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
    uid: string;
    cantidadDeCobros: number;
    cantidadDePagos: number;
    saldado?: boolean;
}


export type ListadoResumenes = Array<ResumenFirestore>;
