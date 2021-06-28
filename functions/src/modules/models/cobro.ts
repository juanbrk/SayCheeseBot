import {Socias} from "../enums/socias";
import {ClienteAsEntity} from "./cliente";

export interface CobroSession {
    registradoPor?: string;
    cliente: ClienteAsEntity;
    monto?: number;
    motivo?: string;
    asignadoA?: Socias;
    dividieronLaPlata?: boolean;
    datosConfirmados: boolean;
}

export interface CobroFirestore {
    registradoPor: string;
    cobradoPor: Socias;
    cliente: ClienteAsEntity;
    monto: number;
    motivo: string;
    fechaCobro: Date;
    uid: string;
    estaDividido: boolean;
}

export interface CobroAsEntity {
    monto: number;
    uid: string;
}
