const { Telegraf, session, Scenes } = require("telegraf");

const {
    insert,
    read,
    update,
    updateCurrentVoice,
    deleteAll,
} = require("./database");

const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);

bot.command("start", async (ctx) => {
    await ctx.reply(
        "Hi there Welcome to voice save bot. Send me a voice to save it. if you need extra help send /help"
    );
});

bot.command("help", async (ctx) => {
    await ctx.reply(
        `Saving: Send a telegram voice than send a name for the voice to save it.
Sending: Access the voice via inline. (write @VoiceSave_bot and search for your voices.)
Deleting: Delete a single voice via sending /delete [voice name] where [voice name] is the name of the voice you want to delete.
Delete All: Delete all your voices using /delete_all command, warning: this action is irreversible!`
    );
});

const { enter, leave } = Scenes.Stage;

const deleteScene = new Scenes.BaseScene("deleteScene");
deleteScene.enter(async (ctx) => {
    await ctx.reply(
        "WARNING: This action ir IRREVERSIBLE!!! if you are certain send /confirm or send /cancel to cancel."
    );
});
deleteScene.command("cancel", async (ctx) => {
    await ctx.reply("Action cancelled.");
    ctx.scene.leave();
});
deleteScene.command("confirm", async (ctx) => {
    const userId = ctx.from.id;
    const error = await deleteAll(userId);
    if (error) {
        await ctx.reply("Error deleting all voices.");
    } else {
        await ctx.reply("All of your voices have been deleted successfully.");
    }
    deleteScene.leave();
});

const voiceSavingScene = new Scenes.BaseScene("voiceSavingScene");
voiceSavingScene.enter(async (ctx) => {});

const stage = new Scenes.Stage([deleteScene], { ttl: 60 });
bot.use(session());
bot.use(stage.middleware());

bot.command("delete_all", async (ctx) => {
    ctx.scene.enter("deleteScene");
});

bot.command("delete", async (ctx) => {
    const userId = ctx.from.id;
    let { voices, currentVoice } = await read(userId);
    if (voices === null) {
        await ctx.reply("You have no saved voices.");
        return;
    }
    let voiceName = ctx.message.text.split(" ").slice(1).join(" ");
    if (voiceName === undefined) {
        await ctx.reply("To delete a voice use /delete VoiceName.");
        return;
    }
    if (voices[voiceName] === undefined) {
        await ctx.reply(
            "Voice not found, Make sure you are spelling it correctly."
        );
        return;
    }
    delete voices[voiceName];
    let error = await update(userId, voices, currentVoice);
    if (error) {
        await ctx.reply("Error deleting voice.");
    } else {
        await ctx.reply("Voice deleted successfully.");
    }
});

bot.on("voice", async (ctx) => {
    const userId = ctx.from.id;
    let { voices } = await read(userId);
    const voiceFileId = ctx.message.voice.file_id;
    if (voices === null) {
        error = await insert(userId, {}, voiceFileId);
    } else {
        error = await updateCurrentVoice(userId, voiceFileId);
    }
    await ctx.reply("Select a Name for the Voice.");
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
    await ctx.reply(
        "Voice saved! Now you can access the voice by tagging the bot in any chat!"
    );
});
bot.on("inline_query", async (ctx) => {
    console.log(ctx.from.first_name);
    const userId = ctx.from.id;
    const { voices } = await read(userId);
    if (voices === null) {
        await ctx.answerInlineQuery([
            {
                type: "article",
                id: "no-voices",
                title: "No Voices Available.",
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
        }));

    await ctx.answerInlineQuery(results, { is_personal: true, cache_time: 10 });
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
