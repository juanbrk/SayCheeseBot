import {Cliente} from "./cliente";
import {CobroSession} from "./cobro";

export interface Session {
	page?: number;
    counter?: number;
	registrandoNuevoCliente?: boolean;
	nuevoCliente: Cliente | undefined;
	cobro?: CobroSession,
}
