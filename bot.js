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

// Carica i dati della palestra
async function loadGymData(gymId) {
    if (!gymId) return null;
    const { data: gym } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single();

    return gym;
}

// Gestione Sessione Persistente
async function getSession(userId, gymId) {
    const { data: session, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code === 'PGRST116') {
        // Sessione non trovata, creala
        const newSession = {
            user_id: userId,
            gym_id: gymId,
            state: { step: 'none' },
            history: []
        };
        const { data } = await supabase
            .from('chat_sessions')
            .insert([newSession])
            .select()
            .single();
        return data;
    }

    // Aggiorna gymId se è cambiato o è nuovo
    if (gymId && session.gym_id !== gymId) {
        const { data } = await supabase
            .from('chat_sessions')
            .update({ gym_id: gymId })
            .eq('user_id', userId)
            .select()
            .single();
        return data;
    }

    return session;
}

async function updateSession(userId, updates) {
    await supabase
        .from('chat_sessions')
        .update(updates)
        .eq('user_id', userId);
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
    console.log(`[Bot] Messaggio da ${userId} per palestra ${gymId}: "${userMessage}"`);

    // 1. Carica o crea sessione persistente
    const session = await getSession(userId, gymId);
    let state = session.state || { step: 'none' };
    let history = session.history || [];

    // 2. Carica dati palestra per contestualizzare
    const targetGymId = gymId || session.gym_id;
    let gymData = null;
    let systemPrompt = `Sei un assistente virtuale AI per palestre. Sei cordiale, professionale e aiuti i clienti con:
- Informazioni su orari, prezzi e corsi
- Prenotazione prove gratuite
- Domande generali sulla palestra

Rispondi sempre in italiano in modo chiaro e conciso.`;

    if (targetGymId) {
        gymData = await loadGymData(targetGymId);
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

Quando un cliente vuole prenotare, chiedi le informazioni una alla volta in modo naturale. SEGUI RIGIDAMENTE IL FLUSSO DI PRENOTAZIONE SE ATTIVO.`;
        }
    }

    // Inizializza history se vuota
    if (history.length === 0) {
        history.push({ role: "system", content: systemPrompt });
    }

    // 3. Gestione FLUSSO PRENOTAZIONE (State Machine)
    let responseText = "";

    // Trigger iniziale
    if (userMessage.toLowerCase().match(/prenota|prenotare|prova|provare|appuntamento/i) && state.step === 'none') {
        state.step = 'ask_name';
        responseText = "Perfetto! Sarò felice di aiutarti a prenotare una prova gratuita. Come ti chiami?";

        await updateSession(userId, { state, history });
        return responseText;
    }

    // Passaggi successivi
    if (state.step !== 'none' && targetGymId) {
        if (state.step === 'ask_name') {
            state.name = userMessage;
            state.step = 'ask_email';
            responseText = `Piacere ${state.name}! Qual è la tua email per la conferma?`;
        }
        else if (state.step === 'ask_email') {
            const emailMatch = userMessage.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            if (!emailMatch) {
                responseText = "Scusa, non sembra un'email valida. Puoi riscriverla correttamente?";
            } else {
                state.email = emailMatch[0];
                state.step = 'ask_phone';
                responseText = "Ottimo! Il tuo numero di telefono?";
            }
        }
        else if (state.step === 'ask_phone') {
            const phoneMatch = userMessage.match(/[\d\s\+\-\(\)]{10,}/);
            if (!phoneMatch) {
                responseText = "Mi serve un numero di telefono valido (almeno 10 cifre). Riprova?";
            } else {
                state.phone = phoneMatch[0].replace(/\s/g, '');
                state.step = 'ask_date';
                responseText = "Quando vorresti venire? (es: domani, 25/01/2026)";
            }
        }
        else if (state.step === 'ask_date') {
            let date;
            if (userMessage.toLowerCase().includes('domani')) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                date = tomorrow.toISOString().split('T')[0];
            } else if (userMessage.toLowerCase().includes('oggi')) {
                date = new Date().toISOString().split('T')[0];
            } else {
                const dateMatch = userMessage.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (dateMatch) {
                    date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
                } else {
                    responseText = "Non ho capito la data. Puoi scriverla in formato GG/MM/AAAA? (es: 22/01/2026)";
                    await updateSession(userId, { state });
                    return responseText;
                }
            }
            state.date = date;
            state.step = 'ask_time';
            responseText = "A che ora preferisci? (es: 10:00, 15:30)";
        }
        else if (state.step === 'ask_time') {
            const timeMatch = userMessage.match(/(\d{1,2}):?(\d{2})?/);
            if (!timeMatch) {
                responseText = "Non ho capito l'ora. Puoi scriverla in formato HH:MM? (es: 10:00)";
            } else {
                const hours = timeMatch[1].padStart(2, '0');
                const minutes = (timeMatch[2] || '00').padStart(2, '0');
                state.time = `${hours}:${minutes}`;

                try {
                    const available = await checkAvailability(targetGymId, state.date, state.time);
                    if (available) {
                        await createBooking(targetGymId, state.name, state.phone, state.email, state.date, state.time);
                        responseText = `✅ Prenotazione confermata per ${state.name}!

📅 Data: ${state.date}
🕐 Ora: ${state.time}
📍 Palestra: ${gymData ? gymData.gym_name : 'La nostra sede'}

Ti aspettiamo!`;
                        state = { step: 'none' }; // Reset
                    } else {
                        responseText = `Spiacente, l'orario ${state.time} del ${state.date} è già occupato. Ne preferiresti un altro?`;
                        state.step = 'ask_time';
                    }
                } catch (error) {
                    console.error('Errore booking:', error);
                    responseText = "C'è stato un errore tecnico nel salvare la prenotazione. Contattaci al telefono!";
                    state = { step: 'none' };
                }
            }
        }

        await updateSession(userId, { state, history });
        return responseText;
    }

    // 4. Conversazione normale con AI (Se non siamo in un flusso di prenotazione)
    history.push({ role: "user", content: userMessage });

    try {
        const completion = await groq.chat.completions.create({
            messages: history,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });

        responseText = completion.choices[0]?.message?.content || "Non so cosa rispondere.";
        history.push({ role: "assistant", content: responseText });

        // Mantieni history corta
        if (history.length > 20) {
            history = [history[0], ...history.slice(-10)];
        }

        await updateSession(userId, { state, history });
        return responseText;
    } catch (error) {
        console.error("Errore Groq:", error);
        return "Scusami, ho un problema tecnico momentaneo. Riprova tra poco!";
    }
}

module.exports = { replyToMessage };
