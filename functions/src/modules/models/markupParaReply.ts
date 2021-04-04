export interface MarkupParaReply {
    tipoDeTeclado: string,
    botones: { mensaje: string, url?: string }[],
    mensajeParaEnviarAlChat: string,
}