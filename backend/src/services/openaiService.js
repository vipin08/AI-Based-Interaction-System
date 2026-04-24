const OpenAI = require("openai");

let client;

function getApiProvider() {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (key.startsWith("gsk_")) {
    return "groq";
  }

  return "openai";
}

function hasUsableApiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return false;
  }

  const normalized = String(key).trim();
  if (!normalized || normalized === "your_openai_api_key_here") {
    return false;
  }

  return true;
}

function getClient() {
  if (!client) {
    const provider = getApiProvider();
    const options = {
      apiKey: process.env.OPENAI_API_KEY
    };

    if (provider === "groq") {
      options.baseURL = "https://api.groq.com/openai/v1";
    }

    client = new OpenAI(options);
  }

  return client;
}

function buildSystemPrompt(profile) {
  const username = profile?.username || "User";
  const preferences = profile?.preferences || {};
  const preferenceText = Object.keys(preferences).length
    ? `User preferences: ${JSON.stringify(preferences)}`
    : "No explicit user preferences available.";

  return [
    "You are a helpful AI assistant in a web chat app.",
    `Address the user as ${username} when relevant.`,
    preferenceText,
    "Respond clearly and concisely."
  ].join(" ");
}

function buildDemoFallback(messages, profile, reason) {
  const lastUserMessage = messages.filter((m) => m.role === "user").at(-1)?.content || "";
  const username = profile?.username || "Guest";
  const tone = profile?.preferences?.tone || "friendly";

  const reasonLine =
    reason === "quota"
      ? "API quota/billing is not active yet, so I switched to demo mode."
      : "API key is missing, so I switched to demo mode.";

  return [
    `[Demo mode] Hi ${username}, I received: \"${lastUserMessage}\".`,
    reasonLine,
    "For live AI responses, set a valid API key in OPENAI_API_KEY and ensure billing/credits are enabled.",
    `Current preferred tone: ${tone}.`
  ].join(" ");
}

async function generateAiResponse({ messages, profile }) {
  if (!hasUsableApiKey()) {
    return buildDemoFallback(messages, profile, "missing_key");
  }

  const provider = getApiProvider();
  const model = provider === "groq" ? "llama-3.1-8b-instant" : "gpt-4o-mini";
  const systemPrompt = buildSystemPrompt(profile);
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content }))
  ];

  let response;

  try {
    response = await getClient().chat.completions.create({
      model,
      messages: apiMessages,
      temperature: 0.6
    });
  } catch (error) {
    const isQuotaError =
      Number(error?.status) === 429 ||
      /quota|billing|insufficient_quota/i.test(String(error?.message || ""));

    if (isQuotaError) {
      return buildDemoFallback(messages, profile, "quota");
    }

    throw error;
  }

  const content = response.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Empty AI response from OpenAI API");
  }

  return content;
}

module.exports = {
  generateAiResponse
};
