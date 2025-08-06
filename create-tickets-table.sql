-- Create tickets table for Andiamo Scanner
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  qr_code TEXT UNIQUE NOT NULL,
  event_id UUID REFERENCES events(id),
  customer_name TEXT,
  ticket_type TEXT DEFAULT 'regular',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add test tickets for scanner testing
-- Valid tickets (contain "TICKET" or "ANDIAMO")
INSERT INTO tickets (qr_code, event_id, customer_name, ticket_type, status) VALUES
('TICKET-001-ANDIAMO-2024', (SELECT id FROM events LIMIT 1), 'John Doe', 'VIP', 'active'),
('ANDIAMO-EVENT-2024-TICKET-002', (SELECT id FROM events LIMIT 1), 'Jane Smith', 'Regular', 'active'),
('TICKET-003-ANDIAMO-FESTIVAL', (SELECT id FROM events LIMIT 1), 'Mike Johnson', 'Premium', 'active'),
('ANDIAMO-2024-TICKET-004', (SELECT id FROM events LIMIT 1), 'Sarah Wilson', 'VIP', 'active'),
('TICKET-005-ANDIAMO-SPECIAL', (SELECT id FROM events LIMIT 1), 'Alex Brown', 'Regular', 'active'),
('ANDIAMO-FESTIVAL-TICKET-006', (SELECT id FROM events LIMIT 1), 'Emma Davis', 'Premium', 'active');

-- Invalid tickets (no "TICKET" or "ANDIAMO")
INSERT INTO tickets (qr_code, event_id, customer_name, ticket_type, status) VALUES
('GUEST-001-2024', (SELECT id FROM events LIMIT 1), 'Guest User', 'Guest', 'active'),
('VIP-002-2024', (SELECT id FROM events LIMIT 1), 'VIP User', 'VIP', 'active'),
('REGULAR-003-2024', (SELECT id FROM events LIMIT 1), 'Regular User', 'Regular', 'active'),
('SPECIAL-004-EVENT', (SELECT id FROM events LIMIT 1), 'Special User', 'Special', 'active'),
('TEST-005-2024', (SELECT id FROM events LIMIT 1), 'Test User', 'Test', 'active');

-- Create index for faster QR code lookups
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE ON tickets TO authenticated;
-- GRANT SELECT ON tickets TO anon; 