const { supabase } = require('../db');

// POST /api/bookings - Crea prenotazione con controllo conflitti
async function createBooking(req, res) {
    const { gym_id, customer_name, customer_phone, customer_email, booking_date, booking_time, duration } = req.body;

    // Controllo conflitti: verifica se esiste già una prenotazione nello stesso slot
    const endTime = calculateEndTime(booking_time, duration);

    const { data: conflicts } = await supabase
        .from('bookings')
        .select('*')
        .eq('gym_id', gym_id)
        .eq('booking_date', booking_date)
        .neq('status', 'cancelled')
        .or(`and(booking_time.lte.${booking_time},booking_time.gte.${endTime})`);

    if (conflicts && conflicts.length > 0) {
        return res.status(409).json({
            error: 'Conflitto: esiste già una prenotazione in questo orario',
            conflicts
        });
    }

    // Crea la prenotazione
    const { data, error } = await supabase
        .from('bookings')
        .insert([{
            gym_id,
            customer_name,
            customer_phone,
            customer_email,
            booking_date,
            booking_time,
            duration,
            status: 'pending'
        }])
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
}

// GET /api/bookings/:gymId - Lista prenotazioni per una palestra
async function getBookings(req, res) {
    const { gymId } = req.params;
    const { date, status } = req.query;

    let query = supabase
        .from('bookings')
        .select('*')
        .eq('gym_id', gymId)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

    if (date) query = query.eq('booking_date', date);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}

// DELETE /api/bookings/:id - Cancella prenotazione
async function cancelBooking(req, res) {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}

// Helper: calcola l'orario di fine
function calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

module.exports = { createBooking, getBookings, cancelBooking };
