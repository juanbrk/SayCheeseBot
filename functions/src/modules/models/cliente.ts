export interface ClienteSession {
    nombre?: string;
    telefono?: string;
}

export interface ClienteFirestore {
    nombre: string,
    telefono: string,
    registradoPor: string,
    uid: string
}

export interface ClienteAsEntity {
    nombre: string;
    uid: string;
}

export type ClientesFirestore = Array<ClienteFirestore>
export type ClientesEntities = Array<ClienteAsEntity>

export interface EdicionInformacionCliente {
    cliente: ClienteFirestore;
    mensajeInicial: number;
    propiedadAEditar?: string;
    nuevoValor?: string;
}

export interface RegistroNuevoCliente {
    cliente?: ClienteSession;
    mensajeInicial: number;
}
