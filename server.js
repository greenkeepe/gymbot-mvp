const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { replyToMessage } = require('./bot');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

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
