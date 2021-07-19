import {Socias} from "../enums/socias";
import {ResumenFirestore} from "./resumen";

export interface DatosSaldoSession {
    resumenASaldar: ResumenFirestore;
    sociaQueAdeuda: Socias;
    montoAdeudado: number;
}

export interface SaldoDeudaWizardSession extends DatosSaldoSession{
    registradoPor: string;
    monto?: number;
    asignadoA?: Socias;
    datosConfirmados: boolean;
    saldoRestante?: number
}

