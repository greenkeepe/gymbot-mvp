require('dotenv').config();
const Groq = require("groq-sdk");
const { SYSTEM_PROMPT } = require('./systemPrompt');

// Configura Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'INSERISCI_LA_TUA_KEY_GROQ_QUI'
});

// Mantiene la cronologia per la demo (in produzione usa un DB)
const chatHistory = {};

async function replyToMessage(userId, userMessage) {
    // Inizializza cronologia se nuovo utente
    if (!chatHistory[userId]) {
        chatHistory[userId] = [
            { role: "system", content: SYSTEM_PROMPT }
        ];
    }

    // Aggiungi messaggio utente
    chatHistory[userId].push({ role: "user", content: userMessage });

    try {
        const completion = await groq.chat.completions.create({
            messages: chatHistory[userId],
            model: "llama-3.3-70b-versatile", // Modello attivo e potente
            temperature: 0.7,
            max_tokens: 1024,
        });

        const botResponse = completion.choices[0]?.message?.content || "Non so cosa rispondere.";

        // Aggiungi risposta bot alla storia
        chatHistory[userId].push({ role: "assistant", content: botResponse });

        return botResponse;
    } catch (error) {
        console.error("Errore Groq:", error);
        return "Scusami, ho un problema tecnico momentaneo. Riprova tra poco!";
    }
}

module.exports = { replyToMessage };
