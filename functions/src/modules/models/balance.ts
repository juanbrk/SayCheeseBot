import {CobroAsEntity} from "./cobro";

export interface BalanceFirestore {
    cobro: CobroAsEntity;
    mes: number,
    año: number,
    leCorrespondeAFlor: number;
    leCorrespondeAFer: number;
    fechaGenerado: FirebaseFirestore.Timestamp;
    uid: string;
    estaDividido: boolean;
}
