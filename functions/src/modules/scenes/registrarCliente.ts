import {Composer, Markup, Scenes} from "telegraf";
import {ExtendedContext} from "../../../config/context/myContext";

const stepHandler = new Composer<ExtendedContext>();

stepHandler.command("next", async (ctx) => {
  await ctx.reply("Done");
  return await ctx.scene.leave();
});
stepHandler.command("leave", async (ctx) => {
  await ctx.reply("Step 2. Via command");
  return ctx.wizard.next();
});
stepHandler.use((ctx) =>
  ctx.replyWithMarkdown("Press `Next` button or type /next")
);

export const superWizard = new Scenes.WizardScene(
  "super-wizard",
  async (ctx) => {
    console.log(ctx);
    try {
      ctx.reply(
        "Step 1",
        Markup.inlineKeyboard([
          Markup.button.url("❤️", "http://telegraf.js.org"),
          Markup.button.callback("➡️ Next", "next"),
        ])
      );
    } catch (error) {
      console.log(error);
    }
    return ctx.wizard.next();
  },
  stepHandler
);

