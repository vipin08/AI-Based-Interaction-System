const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const chatMessages = document.getElementById("chatMessages");
const loadingBar = document.getElementById("loadingBar");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");
const statusText = document.getElementById("statusText");
const usernameInput = document.getElementById("usernameInput");
const toneSelect = document.getElementById("toneSelect");
const savePrefsBtn = document.getElementById("savePrefsBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const newChatBtn = document.getElementById("newChatBtn");
const promptChips = document.querySelectorAll("[data-prompt]");

const STORAGE_KEYS = {
  userId: "ai_system_user_id",
  messages: "ai_system_local_messages",
  profile: "ai_system_profile"
};

const state = {
  userId: getOrCreateUserId(),
  profile: loadProfile(),
  messages: loadLocalMessages(),
  recognition: null,
  isListening: false,
  keepVoiceAlive: false
};

init();

window.addEventListener("online", () => {
  if (state.recognition) {
    voiceBtn.disabled = false;
    voiceStatus.textContent = "Voice: ready";
  }
});

window.addEventListener("offline", () => {
  if (!state.isListening) {
    voiceBtn.disabled = true;
    voiceStatus.textContent = "Voice: offline";
    statusText.textContent = "Voice input is unavailable while offline.";
  }
});

function init() {
  usernameInput.value = state.profile.username || "";
  toneSelect.value = state.profile.preferences?.tone || "friendly";

  if (state.messages.length) {
    state.messages.forEach((m) => addMessageToUI(m.role, m.content));
  } else {
    addMessageToUI(
      "assistant",
      "Hello! I can chat with you and also accept voice input. Set your preferences and ask me anything."
    );
  }

  setupVoiceRecognition();
  restoreServerConversation();
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();

  if (!text) {
    return;
  }

  await submitMessage(text);
});

savePrefsBtn.addEventListener("click", async () => {
  state.profile = {
    username: usernameInput.value.trim() || "Guest",
    preferences: {
      tone: toneSelect.value
    }
  };

  saveProfile(state.profile);
  statusText.textContent = "Preferences saved locally";

  try {
    const response = await fetch("/api/chat/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: state.userId,
        username: state.profile.username,
        preferences: state.profile.preferences
      })
    });

    if (!response.ok) {
      throw new Error("Unable to persist preferences on server");
    }

    statusText.textContent = "Preferences synced";
  } catch (error) {
    statusText.textContent = `Profile sync error: ${error.message}`;
  }
});

clearChatBtn.addEventListener("click", () => {
  state.messages = [];
  localStorage.removeItem(STORAGE_KEYS.messages);
  chatMessages.innerHTML = "";
  addMessageToUI("assistant", "Local chat history cleared.");
});

newChatBtn?.addEventListener("click", () => {
  messageInput.focus();
  statusText.textContent = "Ready for a new chat.";
});

promptChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt || "";
    messageInput.value = prompt;
    messageInput.focus();
    statusText.textContent = "Prompt added to composer.";
  });
});

voiceBtn.addEventListener("click", () => {
  if (!state.recognition) {
    statusText.textContent = "Voice input not available in this browser.";
    return;
  }

  if (!navigator.onLine) {
    statusText.textContent = "Voice input needs internet access in this browser.";
    voiceStatus.textContent = "Voice: offline";
    return;
  }

  if (state.isListening) {
    state.keepVoiceAlive = false;
    state.recognition.stop();
    return;
  }

  try {
    state.keepVoiceAlive = true;
    voiceBtn.disabled = true;
    state.recognition.start();
  } catch (error) {
    state.keepVoiceAlive = false;
    voiceBtn.disabled = false;
    statusText.textContent = `Voice could not start: ${error.message}`;
  }
});

async function submitMessage(text) {
  addMessageToUI("user", text);
  state.messages.push({ role: "user", content: text });
  saveLocalMessages(state.messages);

  messageInput.value = "";
  setLoading(true);

  try {
    const response = await fetch("/api/chat/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: state.userId,
        message: text,
        username: state.profile.username || "Guest",
        preferences: state.profile.preferences || { tone: "friendly" }
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.details || payload.error || "Unknown API error");
    }

    const assistantReply = payload.reply || "No response text returned.";
    addMessageToUI("assistant", assistantReply);
    state.messages.push({ role: "assistant", content: assistantReply });

    if (payload.profile) {
      state.profile = payload.profile;
      saveProfile(state.profile);
      usernameInput.value = state.profile.username || "";
      toneSelect.value = state.profile.preferences?.tone || "friendly";
    }

    saveLocalMessages(state.messages);
    statusText.textContent = "Response received";
  } catch (error) {
    const errorText = `Error: ${error.message}`;
    addMessageToUI("assistant", errorText);
    statusText.textContent = "Request failed";
  } finally {
    setLoading(false);
  }
}

function addMessageToUI(role, content) {
  const item = document.createElement("article");
  item.className = `message ${role}`;

  const author = document.createElement("div");
  author.className = "author";
  author.textContent = role === "user" ? (state.profile.username || "You") : "AI Assistant";

  const text = document.createElement("div");
  text.textContent = content;

  item.appendChild(author);
  item.appendChild(text);
  chatMessages.appendChild(item);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setLoading(isLoading) {
  loadingBar.classList.toggle("hidden", !isLoading);
  sendBtn.disabled = isLoading;
  messageInput.disabled = isLoading;
}

function getOrCreateUserId() {
  const existing = localStorage.getItem(STORAGE_KEYS.userId);
  if (existing) {
    return existing;
  }

  const generated = `user_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  localStorage.setItem(STORAGE_KEYS.userId, generated);
  return generated;
}

function loadLocalMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || "[]");
  } catch {
    return [];
  }
}

function saveLocalMessages(messages) {
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages.slice(-40)));
}

function loadProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.profile) || "{}");
    return {
      username: parsed.username || "Guest",
      preferences: {
        tone: parsed.preferences?.tone || "friendly"
      }
    };
  } catch {
    return {
      username: "Guest",
      preferences: { tone: "friendly" }
    };
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

async function restoreServerConversation() {
  try {
    const response = await fetch(`/api/chat/history/${state.userId}`);
    if (!response.ok) {
      throw new Error("History fetch failed");
    }

    const payload = await response.json();
    if (!payload || !payload.messages || !payload.messages.length) {
      return;
    }

    if (!state.messages.length) {
      chatMessages.innerHTML = "";
      payload.messages.forEach((m) => addMessageToUI(m.role, m.content));
      state.messages = payload.messages.map((m) => ({ role: m.role, content: m.content }));
      saveLocalMessages(state.messages);
    }

    if (payload.profile) {
      state.profile = {
        username: payload.profile.username || state.profile.username,
        preferences: {
          tone: payload.profile.preferences?.tone || state.profile.preferences.tone
        }
      };
      saveProfile(state.profile);
      usernameInput.value = state.profile.username;
      toneSelect.value = state.profile.preferences.tone;
    }
  } catch (error) {
    statusText.textContent = `History load warning: ${error.message}`;
  }
}

function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceStatus.textContent = "Voice: unsupported";
    voiceBtn.disabled = true;
    statusText.textContent = "Voice input is not supported in this browser. Use Chrome with microphone permission.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    state.isListening = true;
    voiceStatus.textContent = "Voice: listening...";
    voiceBtn.textContent = "Stop Listening";
    voiceBtn.disabled = false;
  };

  recognition.onend = () => {
    state.isListening = false;
    voiceStatus.textContent = "Voice: ready";
    voiceBtn.textContent = "Voice Input";
    voiceBtn.disabled = false;

    if (state.keepVoiceAlive) {
      window.setTimeout(() => {
        try {
          if (state.keepVoiceAlive && state.recognition && !state.isListening) {
            state.recognition.start();
          }
        } catch (error) {
          statusText.textContent = `Voice restart failed: ${error.message}`;
          state.keepVoiceAlive = false;
        }
      }, 250);
    }
  };

  recognition.onerror = (event) => {
    state.isListening = false;
    state.keepVoiceAlive = false;
    voiceBtn.disabled = false;
    voiceBtn.textContent = "Voice Input";

    if (event.error === "network") {
      voiceBtn.disabled = !navigator.onLine;
      statusText.textContent = navigator.onLine
        ? "Voice service is unavailable in this browser. Try Chrome and allow microphone access."
        : "Voice input needs internet access in this browser.";
      voiceStatus.textContent = navigator.onLine ? "Voice: service unavailable" : "Voice: offline";
      return;
    }

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      statusText.textContent = "Voice error: microphone permission is blocked. Allow mic access and try again.";
      voiceStatus.textContent = "Voice: permission blocked";
      return;
    }

    if (event.error === "no-speech") {
      statusText.textContent = "Voice error: no speech detected. Please try again.";
      voiceStatus.textContent = "Voice: no speech detected";
      return;
    }

    statusText.textContent = `Voice error: ${event.error}`;
    voiceStatus.textContent = "Voice: error";
  };

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (!transcript) {
      return;
    }

    messageInput.value = transcript;
    statusText.textContent = "Voice captured";
  };

  state.recognition = recognition;
  voiceStatus.textContent = "Voice: ready";
}
