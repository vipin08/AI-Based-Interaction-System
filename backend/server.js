const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const chatRoute = require("./src/routes/chat");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "AI interaction system running" });
});

app.use("/api/chat", chatRoute);

app.use((err, req, res, next) => {
  console.error("Unexpected server error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
