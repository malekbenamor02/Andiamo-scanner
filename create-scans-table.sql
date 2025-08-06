-- Create scans table for Andiamo Scanner
CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  event_id UUID REFERENCES events(id),
  ambassador_id UUID REFERENCES ambassadors(id),
  device_info TEXT,
  scan_location TEXT DEFAULT 'Event Venue',
  scan_time TIMESTAMP DEFAULT NOW(),
  scan_result TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scans_ticket_id ON scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scans_event_id ON scans(event_id);
CREATE INDEX IF NOT EXISTS idx_scans_ambassador_id ON scans(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_scans_scan_time ON scans(scan_time);
CREATE INDEX IF NOT EXISTS idx_scans_scan_result ON scans(scan_result);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE ON scans TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON scans TO anon;

-- Insert some test scan records (optional)
-- INSERT INTO scans (ticket_id, event_id, ambassador_id, scan_result) VALUES
-- ('TICKET-001-ANDIAMO-2024', (SELECT id FROM events LIMIT 1), (SELECT id FROM ambassadors LIMIT 1), 'valid'),
-- ('TEST-SCAN-001', (SELECT id FROM events LIMIT 1), (SELECT id FROM ambassadors LIMIT 1), 'invalid');

-- Verify the table was created
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'scans' 
ORDER BY ordinal_position; 