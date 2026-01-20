-- Tabella per le palestre
CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_email TEXT UNIQUE NOT NULL,
    gym_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    opening_hours JSONB DEFAULT '{"monday": "9:00-20:00", "tuesday": "9:00-20:00", "wednesday": "9:00-20:00", "thursday": "9:00-20:00", "friday": "9:00-20:00", "saturday": "10:00-18:00", "sunday": "closed"}',
    trial_duration INTEGER DEFAULT 60,
    chatbot_greeting TEXT DEFAULT 'Ciao! 👋 Benvenuto in palestra. Sono il tuo assistente virtuale. Come posso aiutarti oggi?',
    chatbot_tone TEXT DEFAULT 'amichevole',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella per le prenotazioni
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indice per velocizzare le query di conflitto
CREATE INDEX idx_bookings_gym_date_time ON bookings(gym_id, booking_date, booking_time);

-- Row Level Security (RLS) per isolare i dati tra palestre
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: ogni palestra vede solo i propri dati
CREATE POLICY "Gyms can only see their own data" ON gyms
    FOR ALL USING (auth.jwt() ->> 'email' = owner_email);

CREATE POLICY "Bookings are visible to gym owners" ON bookings
    FOR ALL USING (
        gym_id IN (
            SELECT id FROM gyms WHERE owner_email = auth.jwt() ->> 'email'
        )
    );
