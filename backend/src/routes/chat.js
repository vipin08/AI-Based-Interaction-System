const express = require("express");
const { generateAiResponse } = require("../services/openaiService");
const {
  getConversation,
  appendMessages,
  setUserProfile
} = require("../store/conversationStore");

const router = express.Router();

router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const conversation = await getConversation(userId);
    if (!conversation) {
      return res.json({ profile: null, messages: [] });
    }

    return res.json(conversation);
  } catch (error) {
    console.error("History endpoint error:", error);
    return res.status(500).json({ error: "Failed to load history" });
  }
});

router.post("/profile", async (req, res) => {
  try {
    const { userId, username, preferences } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const profile = await setUserProfile(userId, { username, preferences });
    return res.json({ profile });
  } catch (error) {
    console.error("Profile endpoint error:", error);
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

router.post("/respond", async (req, res) => {
  try {
    const { userId, message, username, preferences } = req.body || {};

    if (!userId || !message || !String(message).trim()) {
      return res.status(400).json({ error: "userId and message are required" });
    }

    const existingConversation = await getConversation(userId);
    const profile = {
      username: username || existingConversation?.profile?.username || "Guest",
      preferences: {
        ...(existingConversation?.profile?.preferences || {}),
        ...(preferences || {})
      }
    };

    const contextMessages = existingConversation?.messages || [];
    const userMessage = { role: "user", content: String(message).trim() };

    const aiText = await generateAiResponse({
      messages: [...contextMessages, userMessage],
      profile
    });

    const updated = await appendMessages(userId, profile, [
      userMessage,
      { role: "assistant", content: aiText }
    ]);

    return res.json({
      reply: aiText,
      profile: updated.profile,
      messages: updated.messages
    });
  } catch (error) {
    console.error("Respond endpoint error:", error);

    const statusCode = /OPENAI_API_KEY/i.test(error.message) ? 500 : 502;
    return res.status(statusCode).json({
      error: "Failed to generate AI response",
      details: error.message
    });
  }
});

module.exports = router;
