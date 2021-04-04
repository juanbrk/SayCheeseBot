import { Context } from "telegraf";

const datosInteresantes = [
    "Cuando se encontró el primer hueso de dinosaurio hace miles de años en China, se creyó que era de un dragón, ya " +
    "que en ese país hay una cultura milenaria relacionado a ellos",
  ];

export async function responderAInlineInteresante(ctx: Context){
    await ctx.editMessageText("¿Sabías que..");
    const datoInteresante = datosInteresantes[Math.floor(Math.random() * datosInteresantes.length)];
    ctx.reply(`${datoInteresante}?`);
    return ctx.telegram.answerCbQuery(ctx.callbackQuery!.id);
}