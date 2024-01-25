const { Telegraf } = require("telegraf");
const { insert, read, update, updateCurrentVoice } = require("./database");

const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);

bot.command("start", async (ctx) => {
    await ctx.reply(
        "Hi there Welcome to voice save bot. Send me a voice to save it"
    );
});

bot.command("help", async (ctx) => {
    await ctx.reply(
        "Send a telegram voice than send a name for the voice to save it. Access the voice by writing @VoiceSave_bot and searching for your voice"
    );
});

bot.on("voice", async (ctx) => {
    const userId = ctx.from.id;
    let { voices } = await read(userId);
    const voiceFileId = ctx.message.voice.file_id;
    let error;
    if (voices === null) {
        error = await insert(userId, {}, voiceFileId);
    } else {
        error = await updateCurrentVoice(userId, voiceFileId);
    }
    await ctx.reply("Select a Name for the Voice");
});

bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    let { voices, currentVoice } = await read(userId);
    if (currentVoice === null) {
        await ctx.reply("Send me a voice first to save it!");
        return;
    }
    voiceName = ctx.message.text;
    voices[voiceName] = currentVoice;
    await update(userId, voices, null);
    await ctx.reply("Voice saved!");
});

bot.on("inline_query", async (ctx) => {
    const userId = ctx.from.id;
    console.log(ctx.from.first_name);
    const { voices } = await read(userId);
    if (voices === null) {
        await ctx.answerInlineQuery([
            {
                type: "article",
                id: "no-voices",
                title: "No Voices Available",
                description: "You haven't saved any voices yet.",
                input_message_content: {
                    message_text: "You haven't saved any voices yet.",
                },
            },
        ]);
        return;
    }

    const query = ctx.inlineQuery.query.toLowerCase();

    const results = Object.entries(voices)
        .filter(([name]) => name.toLowerCase().includes(query))
        .map(([name, voice]) => ({
            type: "voice",
            id: voice.slice(0, 64),
            title: name,
            voice_file_id: voice,
            is_personal: true,
        }));

    await ctx.answerInlineQuery(results);
});

exports.handler = async (event) => {
    try {
        await bot.handleUpdate(JSON.parse(event.body));
        return { statusCode: 200, body: "" };
    } catch (e) {
        console.error("error in handler:", e);
        return {
            statusCode: 400,
            body: "This endpoint is meant for bot and telegram communication",
        };
    }
};
