import {Socias} from "../enums/socias";

export interface ExtractoResumen {
    montoAdeudado: number;
    sociaQueDebe: Socias;
    sociaAdeudada: Socias;
}
