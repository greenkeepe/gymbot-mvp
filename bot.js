require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SYSTEM_PROMPT } = require('./systemPrompt');

// Configura qui la tua chiave API o usa .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'INSERISCI_LA_TUA_KEY_GEMINI_QUI');

// Mantiene la cronologia per la demo (in produzione usa un DB)
const chatHistory = {};

async function replyToMessage(userId, userMessage) {
    // Inizializza cronologia se nuovo utente
    if (!chatHistory[userId]) {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        chatHistory[userId] = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: SYSTEM_PROMPT }],
                },
                {
                    role: "model",
                    parts: [{ text: "Ok, ho capito il mio ruolo. Sono GymBot." }],
                },
            ],
        });
    }

    try {
        const chat = chatHistory[userId];
        const result = await chat.sendMessage(userMessage);
        const botResponse = result.response.text();

        return botResponse;
    } catch (error) {
        console.error("Errore Gemini:", error);
        return "Scusami, ho un problema tecnico momentaneo. Riprova tra poco!";
    }
}

module.exports = { replyToMessage };
