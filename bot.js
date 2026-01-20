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

// Mantiene la cronologia per la demo (in produzione usa un DB)
const chatHistory = {};

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
- Orari: ${JSON.stringify(gymData.business_hours || {})}

CORSI DISPONIBILI:
${(gymData.courses || []).map(c => `- ${c.name}: ${c.description} (€${c.price}, ${c.duration} min)`).join('\n')}

STAFF & TRAINER:
${(gymData.trainers || []).map(t => `- ${t.name}: ${t.specialization}`).join('\n')}

PREZZI:
${gymData.pricing ? `
- Mensile: €${gymData.pricing.membership?.monthly}
- Trimestrale: €${gymData.pricing.membership?.quarterly}
- Annuale: €${gymData.pricing.membership?.annual}
- Prova: €${gymData.pricing.trial}
` : 'Non configurati'}

TONO: ${gymData.chatbot_tone || 'Professionale e cordiale'}
SALUTO: ${gymData.chatbot_greeting || 'Ciao! Come posso aiutarti?'}

Quando un cliente vuole prenotare, chiedi:
1. Nome completo
2. Telefono
3. Email
4. Data preferita (formato YYYY-MM-DD)
5. Ora preferita (formato HH:MM)

Poi conferma la disponibilità e crea la prenotazione.`;
        }
    }

    // Inizializza cronologia se nuovo utente
    if (!chatHistory[userId]) {
        chatHistory[userId] = [
            { role: "system", content: systemPrompt }
        ];
    }

    // Aggiungi messaggio utente
    chatHistory[userId].push({ role: "user", content: userMessage });

    try {
        const completion = await groq.chat.completions.create({
            messages: chatHistory[userId],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });

        let botResponse = completion.choices[0]?.message?.content || "Non so cosa rispondere.";

        // Controlla se il messaggio contiene una richiesta di prenotazione
        // (Questo è un esempio semplice - in produzione useresti NLP più avanzato)
        if (userMessage.toLowerCase().includes('prenota') && gymId) {
            // Estrai info dalla conversazione (esempio semplificato)
            const emailMatch = userMessage.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            const phoneMatch = userMessage.match(/\+?\d{10,}/);

            if (emailMatch && phoneMatch) {
                // Esempio: crea prenotazione per domani alle 10:00
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const date = tomorrow.toISOString().split('T')[0];
                const time = '10:00';

                const available = await checkAvailability(gymId, date, time);
                if (available) {
                    await createBooking(gymId, 'Cliente', phoneMatch[0], emailMatch[0], date, time);
                    botResponse += `\n\n✅ Prenotazione confermata per ${date} alle ${time}!`;
                } else {
                    botResponse += `\n\n❌ Spiacente, quell'orario non è disponibile.`;
                }
            }
        }

        // Aggiungi risposta bot alla storia
        chatHistory[userId].push({ role: "assistant", content: botResponse });

        return botResponse;
    } catch (error) {
        console.error("Errore Groq:", error);
        return "Scusami, ho un problema tecnico momentaneo. Riprova tra poco!";
    }
}

module.exports = { replyToMessage };
