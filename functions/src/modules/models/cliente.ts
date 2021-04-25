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
