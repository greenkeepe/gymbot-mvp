const readline = require('readline');
const { replyToMessage } = require('./bot');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("🏋️  GYMBOT MVP - Test Console");
console.log("Scrivi un messaggio per iniziare (Ctrl+C per uscire)\n");

const userId = "test-user-1";

function ask() {
    rl.question('Tu: ', async (input) => {
        const response = await replyToMessage(userId, input);
        console.log(`GymBot: ${response}\n`);
        ask();
    });
}

ask();
