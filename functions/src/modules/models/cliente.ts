export interface Cliente {
    nombre?: string;
    telefono?: string;
    mensajeInicial: number;
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
