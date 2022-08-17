import {Socias} from "../enums/socias";
import {ListadoResumenes, ResumenFirestore} from "./resumen";

export interface DatosSaldoMensualSession {
    resumenASaldar: ResumenFirestore;
    sociaQueAdeuda: Socias;
    montoAdeudado: number;
}

export interface DatosSaldoAnualSession {
    resumenesParaSaldar: ListadoResumenes;
}

export interface SaldoDeudaWizardSession extends DatosSaldoMensualSession{
    registradoPor: string;
    monto?: number;
    asignadoA?: Socias;
    datosConfirmados: boolean;
    saldoRestante?: number
}

export interface SaldoDeudaTotalWizardSession extends DatosSaldoAnualSession {
    montoDeudaFinal: number;
    deudora: Socias;
    montoASaldar?: number;
    registradoPor?: string;
}

