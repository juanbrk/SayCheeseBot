import {ExtendedContext} from "../../../config/context/myContext";
import {PropiedadesCobro} from "../enums/cobro";
import {Socias} from "../enums/socias";
import {ClienteAsEntity} from "./cliente";
import {MyWizardSession} from "./session";

import {Timestamp} from "firebase-admin/firestore";
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

export interface GuardarPropiedadCobroParams {
    ctx: ExtendedContext;
    sessionActual: MyWizardSession;
    propiedadAGuardar: PropiedadesCobro;
    valorAguardar?: Socias | boolean;
}

export interface VisualizacionCobroSession{
    socia?: Socias;
    mesSeleccionado?: Meses;
    anos?: Record<string, string>;
    anoSeleccionado?: string;
}

export interface ResumenCobro extends CobroSession {
    fechaCobro: Timestamp;
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
