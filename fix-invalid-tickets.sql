-- Fix invalid tickets by marking them as inactive
-- This will make them fail validation when scanned

-- Mark invalid tickets as inactive
UPDATE tickets 
SET status = 'inactive' 
WHERE qr_code IN (
  'GUEST-001-2024',
  'VIP-002-2024', 
  'REGULAR-003-2024',
  'SPECIAL-004-EVENT',
  'TEST-005-2024'
);

-- Verify the changes
SELECT qr_code, status, customer_name, ticket_type 
FROM tickets 
ORDER BY status, qr_code;

-- Expected result:
-- Valid tickets (status = 'active'): TICKET-001-ANDIAMO-2024, ANDIAMO-EVENT-2024-TICKET-002, etc.
-- Invalid tickets (status = 'inactive'): GUEST-001-2024, VIP-002-2024, etc. 