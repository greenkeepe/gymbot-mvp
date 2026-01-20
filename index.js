const { onRequest } = require("firebase-functions/v2/https");
const app = require("./server");

// Espone l'app Express come funzione Cloud (v2)
exports.api = onRequest(app);
