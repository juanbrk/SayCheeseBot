import {TipoPago} from "../enums/pago";
import {Socias} from "../enums/socias";

export interface PagoSession {
    registradoPor?: string;
    monto?: number;
    motivo?: string;
    asignadoA?: Socias;
    dividieronLaPlata?: boolean;
    datosConfirmados: boolean;
    tipoPago?: TipoPago;
}

export interface PagoFirestore extends PagoSession {
    uid: string;
    dateCreated: Date;
    dateUpdated: Date;
}
