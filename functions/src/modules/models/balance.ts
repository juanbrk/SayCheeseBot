import {CobroAsEntity} from "./cobro";
import {PagoAsEntity} from "./pago";
import {TipoTransaccion} from "../enums/tipoTransaccion";

export interface BalanceFirestore {
    transaccion: CobroAsEntity | PagoAsEntity;
    tipoTransaccion: TipoTransaccion;
    mes: number,
    año: number,
    leCorrespondeAFlor: number;
    leCorrespondeAFer: number;
    fechaGenerado: FirebaseFirestore.Timestamp;
    uid: string;
    estaDividido: boolean;
}
