require("dotenv").config();
const express = require("express");
const { getHistory, appendHistory } = require("./services/redis");
const { generateReply } = require("./services/gemini");
const { sendWhatsAppMessage } = require("./services/whatsapp");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---- 1. Webhook verification (Meta calls this once when you set up the webhook) ----
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Real verification handshake
  if (mode && token) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403); // wrong token — genuinely reject
  }

  // No hub.* params — likely a health-check ping, not a verification attempt
  return res.sendStatus(200);
});

// ---- 2. Receiving incoming WhatsApp messages ----
app.post("/webhook", async (req, res) => {
  // Always respond 200 quickly so Meta doesn't retry/mark the webhook as failing
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return; // could be a status update (delivered/read), not a real message

    const from = message.from; // sender's WhatsApp ID (phone number)
    const incomingText = message.text?.body;

    if (!incomingText) return; // skip non-text messages (images, audio, etc.) for now

    console.log(`Incoming from ${from}: ${incomingText}`);

    // Fetch conversation history for context
    const history = await getHistory(from);

    // Generate reply using Gemini
    const reply = await generateReply(history, incomingText);

    // Send reply back via WhatsApp
    await sendWhatsAppMessage(from, reply);

    // Save this exchange to Redis for future context
    await appendHistory(from, incomingText, reply);

    console.log(`Replied to ${from}: ${reply}`);
  } catch (err) {
    console.error("Error handling incoming message:", err);
  }
});

// Simple health check route
app.get("/", (req, res) => {
  res.send("WhatsApp AI Assistant is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
