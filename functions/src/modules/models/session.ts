import {Cliente} from "./cliente";

export interface Session {
	page?: number;
    counter?: number;
	registrandoNuevoCliente?: boolean;
	nuevoCliente: Cliente | undefined;
}
