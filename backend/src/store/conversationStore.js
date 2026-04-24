const fs = require("fs/promises");
const path = require("path");

const DB_PATH = path.resolve(__dirname, "../../data/conversations.json");
const MAX_CONTEXT_MESSAGES = Number(process.env.MAX_CONTEXT_MESSAGES || 12);

async function readDb() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(raw || "{}");
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function writeDb(data) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

function ensureUserRecord(db, userId, profile = {}) {
  if (!db[userId]) {
    db[userId] = {
      profile: {
        username: profile.username || "Guest",
        preferences: profile.preferences || {}
      },
      messages: []
    };
  }

  if (profile.username) {
    db[userId].profile.username = profile.username;
  }

  if (profile.preferences && typeof profile.preferences === "object") {
    db[userId].profile.preferences = {
      ...db[userId].profile.preferences,
      ...profile.preferences
    };
  }

  return db[userId];
}

function trimContext(messages) {
  if (messages.length <= MAX_CONTEXT_MESSAGES) {
    return messages;
  }

  return messages.slice(-MAX_CONTEXT_MESSAGES);
}

async function getConversation(userId) {
  const db = await readDb();
  return db[userId] || null;
}

async function appendMessages(userId, profile, newMessages) {
  const db = await readDb();
  const userRecord = ensureUserRecord(db, userId, profile);

  userRecord.messages = trimContext([
    ...userRecord.messages,
    ...newMessages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date().toISOString()
    }))
  ]);

  await writeDb(db);
  return userRecord;
}

async function setUserProfile(userId, profile) {
  const db = await readDb();
  const userRecord = ensureUserRecord(db, userId, profile);
  await writeDb(db);
  return userRecord.profile;
}

module.exports = {
  getConversation,
  appendMessages,
  setUserProfile
};
