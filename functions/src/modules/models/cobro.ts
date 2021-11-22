import {Socias} from "../enums/socias";
import {ClienteAsEntity} from "./cliente";

import admin = require("firebase-admin");
import {Meses} from "../enums/meses";

export interface CobroSession {
    registradoPor?: string;
    cobradoPor?: string;
    cliente: ClienteAsEntity;
    monto?: number;
    motivo?: string;
    asignadoA?: Socias;
    dividieronLaPlata?: boolean;
    datosConfirmados: boolean;
}

export interface VisualizacionCobroSession{
    socia?: Socias;
    mesSeleccionado?: Meses;
}

export interface ResumenCobro extends CobroSession {
    fechaCobro: admin.firestore.Timestamp;
}


export type ResumenesCobro = Array<ResumenCobro>


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
    realizadoPor: Socias;
}
