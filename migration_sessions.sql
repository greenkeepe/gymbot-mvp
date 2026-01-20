-- Tabella per le sessioni di chat (persistenza stato chatbot)
CREATE TABLE IF NOT EXISTS chat_sessions (
    user_id TEXT PRIMARY KEY,
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    state JSONB DEFAULT '{"step": "none"}',
    history JSONB DEFAULT '[]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funzione per aggiornare automaticamente il timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Abilita RLS per sicurezza (anche se useremo service role o anon key configurata)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Note: In questa fase di MVP lasciamo l'accesso libero alle sessioni 
-- tramite anon key se necessario, o gestiamo tutto lato server.
CREATE POLICY "Public chat sessions access" ON chat_sessions
    FOR ALL USING (true);
