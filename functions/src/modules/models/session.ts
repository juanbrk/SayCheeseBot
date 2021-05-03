import {EdicionInformacionCliente, RegistroNuevoCliente} from "./cliente";
import {CobroSession} from "./cobro";

export interface Session {
	page?: number;
    counter?: number;
	nuevoCliente?: RegistroNuevoCliente;
	cobro?: CobroSession;
	edicionInformacionCliente?: EdicionInformacionCliente;
}
