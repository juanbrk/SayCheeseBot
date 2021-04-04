import { Context } from "telegraf";

const urlsCosasGraciosas = [
    "https://media.giphy.com/media/26tP3M3i03hoIYL6M/giphy.gif",
];

export async function responderAInlineGracioso(ctx: Context){
    await ctx.editMessageText("Aquí te va algo gracioso");
    const urlGraciosa = urlsCosasGraciosas[Math.floor(Math.random() * urlsCosasGraciosas.length)];
    await ctx.telegram.sendDocument(ctx.chat!.id, urlGraciosa);
    return ctx.telegram.answerCbQuery(ctx.callbackQuery!.id);
}