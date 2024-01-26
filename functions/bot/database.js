const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://tdltgflceomgyxobibit.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function insert(userId, voices, currentVoice = null) {
    voices = JSON.stringify(voices);
    const { data, error } = await supabase
        .from("voice_messages")
        .insert([{ userId, voices, currentVoice }])
        .select();
    return error;
}

async function read(userId) {
    let { data: voice_messages, error } = await supabase
        .from("voice_messages")
        .select("voices,currentVoice")
        .eq("userId", userId);
    if (voice_messages.length === 0)
        return { voices: null, currentVoice: null };
    voice_messages = voice_messages[0];
    voice_messages.voices = JSON.parse(voice_messages.voices);
    return voice_messages;
}

async function update(userId, voices, currentVoice) {
    voices = JSON.stringify(voices);
    const { data, error } = await supabase
        .from("voice_messages")
        .update({ voices, currentVoice })
        .eq("userId", userId)
        .select();
    return error;
}
async function updateCurrentVoice(userId, currentVoice) {
    const { data, error } = await supabase
        .from("voice_messages")
        .update({ currentVoice })
        .eq("userId", userId)
        .select();
    return error;
}
async function deleteAll(userId) {
    const { error } = await supabase
        .from("voice_messages")
        .delete()
        .eq("userId", userId);
    return error;
}

module.exports = {
    insert,
    updateCurrentVoice,
    read,
    update,
    deleteAll,
};
