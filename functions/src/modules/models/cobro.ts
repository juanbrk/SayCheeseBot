import {ClienteAsEntity} from "./cliente";

export interface CobroSession {
    mensajeInicial?: number;
    registrandoNuevoCobro?: boolean;
    registradoPor?: string;
    cliente: ClienteAsEntity;
    monto?: number;
    motivo?: string;
}

export interface CobroFirestore {
    registradoPor: string;
    cliente: ClienteAsEntity;
    monto: number;
    motivo: string;
    fechaCobro: Date;
    uid: string;
}

