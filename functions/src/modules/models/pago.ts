import {Socias} from "../enums/socias";

export interface PagoSession {
    registradoPor?: string;
    monto?: number;
    motivo?: string;
    asignadoA?: Socias;
    dividieronLaPlata?: boolean;
    datosConfirmados: boolean;
    esSaldo?: boolean;
}

export interface PagoFirestore extends PagoSession {
    uid: string;
    dateCreated: Date;
    dateUpdated: Date;
}

export interface PagoAsEntity {
    monto: number;
    uid: string;
    realizadoPor: Socias;
}
