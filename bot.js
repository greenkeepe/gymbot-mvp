require('dotenv').config();
const Groq = require("groq-sdk");
const { createClient } = require('@supabase/supabase-js');

// Configura Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'INSERISCI_LA_TUA_KEY_GROQ_QUI'
});

// Configura Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://vyspmhrbgaxvmkaqrrfo.supabase.co',
    process.env.SUPABASE_ANON_KEY || ''
);

// Mantiene la cronologia e lo stato delle prenotazioni
const chatHistory = {};
const bookingState = {};

// Carica i dati della palestra
async function loadGymData(gymId) {
    const { data: gym } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single();

    return gym;
}

// Controlla disponibilità
async function checkAvailability(gymId, date, time) {
    const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('gym_id', gymId)
        .eq('booking_date', date)
        .eq('booking_time', time);

    return bookings.length === 0;
}

// Crea prenotazione
async function createBooking(gymId, customerName, customerPhone, customerEmail, date, time) {
    const { data, error } = await supabase
        .from('bookings')
        .insert({
            gym_id: gymId,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            booking_date: date,
            booking_time: time,
            duration: 60,
            status: 'confirmed'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function replyToMessage(userId, userMessage, gymId = null) {
    // Carica dati palestra se fornito gymId
    let gymData = null;
    let systemPrompt = `Sei un assistente virtuale AI per palestre. Sei cordiale, professionale e aiuti i clienti con:
- Informazioni su orari, prezzi e corsi
- Prenotazione prove gratuite
- Domande generali sulla palestra

Rispondi sempre in italiano in modo chiaro e conciso.`;

    if (gymId) {
        gymData = await loadGymData(gymId);
        if (gymData) {
            systemPrompt = `Sei l'assistente virtuale di ${gymData.gym_name}.

INFORMAZIONI PALESTRA:
- Nome: ${gymData.gym_name}
- Indirizzo: ${gymData.address || 'Non specificato'}
- Telefono: ${gymData.phone || 'Non specificato'}

CORSI DISPONIBILI:
${(gymData.courses || []).map(c => `- ${c.name}: ${c.description} (€${c.price}, ${c.duration} min)`).join('\n') || 'Nessun corso configurato'}

PREZZI:
${gymData.pricing ? `
- Mensile: €${gymData.pricing.membership?.monthly}
- Trimestrale: €${gymData.pricing.membership?.quarterly}
- Annuale: €${gymData.pricing.membership?.annual}
- Prova: €${gymData.pricing.trial}
` : 'Non configurati'}

TONO: ${gymData.chatbot_tone || 'Professionale e cordiale'}

Quando un cliente vuole prenotare, chiedi le informazioni una alla volta in modo naturale.`;
        }
    }

    // Inizializza cronologia se nuovo utente
    if (!chatHistory[userId]) {
        chatHistory[userId] = [
            { role: "system", content: systemPrompt }
        ];
    }

    // Gestione stato prenotazione
    if (!bookingState[userId]) {
        bookingState[userId] = { step: 'none' };
    }

    const state = bookingState[userId];

    // Controlla se l'utente vuole prenotare
    if (userMessage.toLowerCase().match(/prenota|prenotare|prova|provare|appuntamento/i) && state.step === 'none') {
        state.step = 'ask_name';
        return "Perfetto! Sarò felice di aiutarti a prenotare. Come ti chiami?";
    }

    // Gestione flusso prenotazione
    if (state.step !== 'none' && gymId) {
        if (state.step === 'ask_name') {
            state.name = userMessage;
            state.step = 'ask_email';
            return `Piacere ${state.name}! Qual è la tua email?`;
        }

        if (state.step === 'ask_email') {
            const emailMatch = userMessage.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            if (!emailMatch) {
                return "Mi serve un'email valida per confermare la prenotazione. Puoi riprovare?";
            }
            state.email = emailMatch[0];
            state.step = 'ask_phone';
            return "Perfetto! E il tuo numero di telefono?";
        }

        if (state.step === 'ask_phone') {
            const phoneMatch = userMessage.match(/[\d\s\+\-\(\)]{10,}/);
            if (!phoneMatch) {
                return "Mi serve un numero di telefono valido. Puoi riprovare?";
            }
            state.phone = phoneMatch[0].replace(/\s/g, '');
            state.step = 'ask_date';
            return "Quando vorresti venire? (es: domani, lunedì, 22/01/2026)";
        }

        if (state.step === 'ask_date') {
            // Parsing semplificato della data
            let date;
            if (userMessage.toLowerCase().includes('domani')) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                date = tomorrow.toISOString().split('T')[0];
            } else if (userMessage.toLowerCase().includes('oggi')) {
                date = new Date().toISOString().split('T')[0];
            } else {
                // Prova a parsare formato DD/MM/YYYY
                const dateMatch = userMessage.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (dateMatch) {
                    date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
                } else {
                    return "Non ho capito la data. Puoi scriverla in formato GG/MM/AAAA? (es: 22/01/2026)";
                }
            }
            state.date = date;
            state.step = 'ask_time';
            return "A che ora preferisci? (es: 10:00, 15:30)";
        }

        if (state.step === 'ask_time') {
            const timeMatch = userMessage.match(/(\d{1,2}):?(\d{2})?/);
            if (!timeMatch) {
                return "Non ho capito l'ora. Puoi scriverla in formato HH:MM? (es: 10:00)";
            }
            const hours = timeMatch[1].padStart(2, '0');
            const minutes = (timeMatch[2] || '00').padStart(2, '0');
            state.time = `${hours}:${minutes}`;

            // Controlla disponibilità e crea prenotazione
            try {
                const available = await checkAvailability(gymId, state.date, state.time);
                if (available) {
                    await createBooking(gymId, state.name, state.phone, state.email, state.date, state.time);
                    const response = `✅ Prenotazione confermata!

📅 Data: ${state.date}
🕐 Ora: ${state.time}
👤 Nome: ${state.name}
📧 Email: ${state.email}
📞 Telefono: ${state.phone}

Ti aspettiamo! Riceverai una conferma via email.`;

                    // Reset stato
                    bookingState[userId] = { step: 'none' };
                    return response;
                } else {
                    state.step = 'ask_time';
                    return `❌ Spiacente, l'orario ${state.time} del ${state.date} non è disponibile. Puoi scegliere un altro orario?`;
                }
            } catch (error) {
                console.error('Errore creazione prenotazione:', error);
                bookingState[userId] = { step: 'none' };
                return "Mi dispiace, c'è stato un errore nel salvare la prenotazione. Riprova o contattaci direttamente.";
            }
        }
    }

    // Conversazione normale con AI
    chatHistory[userId].push({ role: "user", content: userMessage });

    try {
        const completion = await groq.chat.completions.create({
            messages: chatHistory[userId],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });

        const botResponse = completion.choices[0]?.message?.content || "Non so cosa rispondere.";
        chatHistory[userId].push({ role: "assistant", content: botResponse });

        return botResponse;
    } catch (error) {
        console.error("Errore Groq:", error);
        return "Scusami, ho un problema tecnico momentaneo. Riprova tra poco!";
    }
}

module.exports = { replyToMessage };
