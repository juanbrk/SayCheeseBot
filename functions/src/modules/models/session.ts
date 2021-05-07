import {EdicionInformacionCliente, RegistroNuevoCliente} from "./cliente";
import {CobroSession} from "./cobro";
import {ListadoResumenes} from "./resumen";

export interface Session {
	page?: number;
    counter?: number;
	nuevoCliente?: RegistroNuevoCliente;
	cobro?: CobroSession;
	edicionInformacionCliente?: EdicionInformacionCliente;
	resumenes?: ListadoResumenes;
}
