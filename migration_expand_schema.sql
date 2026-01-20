-- Espandi schema gyms con nuove colonne
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS courses JSONB DEFAULT '[]';
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS staff JSONB DEFAULT '[]';
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS trainers JSONB DEFAULT '[]';
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS pricing JSONB DEFAULT '{"membership": {"monthly": 50, "quarterly": 130, "annual": 450}, "trial": 10}';
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "21:00", "closed": false}, "tuesday": {"open": "09:00", "close": "21:00", "closed": false}, "wednesday": {"open": "09:00", "close": "21:00", "closed": false}, "thursday": {"open": "09:00", "close": "21:00", "closed": false}, "friday": {"open": "09:00", "close": "21:00", "closed": false}, "saturday": {"open": "10:00", "close": "18:00", "closed": false}, "sunday": {"open": "10:00", "close": "18:00", "closed": true}}';

-- Abilita Realtime per la tabella bookings
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
