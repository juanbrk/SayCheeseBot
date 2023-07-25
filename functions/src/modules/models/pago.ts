import {Meses} from "../enums/meses";
import {Socias} from "../enums/socias";
import admin = require("firebase-admin");


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

export interface VisualizacionPagosSession{
    socia?: Socias;
    mesSeleccionado?: Meses;
    anos?: Record<string, string>;
    anoSeleccionado?: string;
}

export interface ResumenPago extends PagoSession {
    fechaPago: admin.firestore.Timestamp;
}


export type ResumenesPago = Array<ResumenPago>
