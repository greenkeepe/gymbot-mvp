const { supabase } = require('../db');

// GET /api/gyms/:id - Ottieni dati palestra
async function getGym(req, res) {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return res.status(404).json({ error: 'Palestra non trovata' });
    res.json(data);
}

// PUT /api/gyms/:id - Aggiorna configurazione palestra
async function updateGym(req, res) {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
        .from('gyms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
}

// POST /api/gyms - Crea nuova palestra
async function createGym(req, res) {
    const gymData = req.body;

    const { data, error } = await supabase
        .from('gyms')
        .insert([gymData])
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
}

module.exports = { getGym, updateGym, createGym };
