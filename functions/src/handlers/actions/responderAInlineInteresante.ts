import {ExtendedContext} from "../../../config/context/myContext";

const datosInteresantes = [
  "Cuando se encontró el primer hueso de dinosaurio hace miles de años en China, se creyó que era de un dragón, ya " +
    "que en ese país hay una cultura milenaria relacionado a ellos",
];

/**
 *
 * @param {ExtendedContext} ctx
 * @return {Promise}
*/
export async function responderAInlineInteresante(ctx: ExtendedContext) {
  await ctx.editMessageText("¿Sabías que..");
  const datoInteresante = datosInteresantes[Math.floor(Math.random() * datosInteresantes.length)];
  ctx.reply(`${datoInteresante}?`);
  return ctx.telegram.answerCbQuery(ctx.callbackQuery!.id);
}
