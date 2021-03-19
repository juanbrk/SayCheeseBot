// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

const functions = require("firebase-functions");
const {Telegraf} = require('telegraf');
const bot = new Telegraf("1679863001:AAGaNKtMl6tFhDZ_LfH3uZlafwx_GA8uDms");

// const ABOUT_MESSAGE = `Podés utilizar este bot para
//   - Registrar nuevos cobros a clientes
//   - Generar resumenes contables
//   - Chatear con tu socia
// Para comenzar a utilizarlo, escribí */nuevoCobro* en tu teclado`;
const MESSAGE_RECEIVED= 'Mensaje recibido';

// error handling
bot.catch((err, ctx) => {
  functions.logger.error("[Bot] Error", err);
  functions.logger.error("[Bot] Error CTX", ctx);
  return ctx.reply(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

// initialize the commands
bot.command("/start", (ctx) => ctx.reply("Hola Chicas, en que puedo ayudarlas hoy?"));

bot.command('custom', (ctx) => {
  bot.telegram.sendMessage(
    '1183288911',
    'Custom buttons keyboard',
    {
      reply_markup: {
        inline_keyboard: [[{text: "Custom1", url: "https://core.telegram.org/bots/api#sendmessage"}]],
      },
    });
});
// copy every message and send to the user
bot.on("message", (ctx) => {
  const {message} = ctx;
  console.log(`MESSAGE ${JSON.stringify(message)}`);
  const promises = [];

  if (message.new_chat_member) {
    const welcomeMessage = `Bienvenida ${message.new_chat_member.first_name} al grupo!`;
    // ask what to do

    // const messageID = message.message_id;
    // const chatId = "-527027995";

    promises.push(ctx.reply(welcomeMessage));
  } else {
    promises.push(ctx.reply(MESSAGE_RECEIVED));
  }

  return Promise.all(promises);
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
