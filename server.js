const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { replyToMessage } = require('./bot');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint di debug per controllare la configurazione
app.get('/debug', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY;
    const keyStatus = apiKey ? `Presente (Inizia con: ${apiKey.substring(0, 5)}...)` : 'MANCANTE';

    let apiStatus = "Non testato";
    let apiError = null;

    if (apiKey) {
        try {
            // Test chiamata a Groq
            const { Groq } = require("groq-sdk");
            const groq = new Groq({ apiKey: apiKey });
            await groq.chat.completions.create({
                messages: [{ role: "user", content: "Test" }],
                model: "llama-3.3-70b-versatile",
            });
            apiStatus = "✅ Connessione OK";
        } catch (e) {
            apiStatus = "❌ Errore Connessione";
            apiError = e.message;
        }
    }

    res.json({
        env_vars: {
            GROQ_API_KEY: keyStatus
        },
        api_connection: apiStatus,
        error_details: apiError
    });
});

app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Default userId if not provided
    const uid = userId || 'web-user';

    try {
        const response = await replyToMessage(uid, message);
        res.json({ reply: response });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Export app for Firebase Cloud Functions
module.exports = app;

// Only start listener if running directly (local dev)
if (require.main === module) {
    app.listen(port, '0.0.0.0', () => {
        console.log(`GymBot Web Server listening at http://0.0.0.0:${port}`);
    });
}
