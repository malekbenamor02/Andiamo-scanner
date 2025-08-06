-- Add more test tickets for Andiamo Scanner testing
-- Make sure to replace '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9' with your actual event ID

-- Valid tickets (contain "TICKET" or "ANDIAMO") - Active status
INSERT INTO tickets (qr_code, event_id, customer_name, ticket_type, status) VALUES
('TICKET-007-ANDIAMO-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Maria Garcia', 'VIP', 'active'),
('ANDIAMO-EVENT-2024-TICKET-008', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'David Chen', 'Regular', 'active'),
('TICKET-009-ANDIAMO-FESTIVAL', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Lisa Thompson', 'Premium', 'active'),
('ANDIAMO-2024-TICKET-010', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Robert Wilson', 'VIP', 'active'),
('TICKET-011-ANDIAMO-SPECIAL', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Emma Rodriguez', 'Regular', 'active'),
('ANDIAMO-FESTIVAL-TICKET-012', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Michael Brown', 'Premium', 'active'),
('TICKET-013-ANDIAMO-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Sarah Johnson', 'VIP', 'active'),
('ANDIAMO-EVENT-TICKET-014', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'James Davis', 'Regular', 'active'),
('TICKET-015-ANDIAMO-SPECIAL', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Jennifer Lee', 'Premium', 'active'),
('ANDIAMO-2024-TICKET-016', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Christopher Miller', 'VIP', 'active');

-- Already used tickets (for testing "already used" scenario)
INSERT INTO tickets (qr_code, event_id, customer_name, ticket_type, status) VALUES
('TICKET-017-ANDIAMO-USED', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Amanda White', 'Regular', 'used'),
('ANDIAMO-EVENT-2024-TICKET-018-USED', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Daniel Taylor', 'VIP', 'used'),
('TICKET-019-ANDIAMO-FESTIVAL-USED', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Nicole Anderson', 'Premium', 'used'),
('ANDIAMO-2024-TICKET-020-USED', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Kevin Martinez', 'Regular', 'used'),
('TICKET-021-ANDIAMO-SPECIAL-USED', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Rachel Green', 'VIP', 'used');

-- Invalid tickets (no "TICKET" or "ANDIAMO") - Inactive status
INSERT INTO tickets (qr_code, event_id, customer_name, ticket_type, status) VALUES
('GUEST-006-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Guest User 6', 'Guest', 'inactive'),
('VIP-007-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'VIP User 7', 'VIP', 'inactive'),
('REGULAR-008-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Regular User 8', 'Regular', 'inactive'),
('SPECIAL-009-EVENT', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Special User 9', 'Special', 'inactive'),
('TEST-010-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Test User 10', 'Test', 'inactive'),
('DEMO-011-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Demo User 11', 'Demo', 'inactive'),
('SAMPLE-012-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Sample User 12', 'Sample', 'inactive'),
('FAKE-013-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Fake User 13', 'Fake', 'inactive'),
('DUMMY-014-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Dummy User 14', 'Dummy', 'inactive'),
('INVALID-015-2024', '8e1a42ce-1dfa-4c84-b578-f9b62a6491a9', 'Invalid User 15', 'Invalid', 'inactive');

-- Verify the tickets were added
SELECT 
  qr_code, 
  customer_name, 
  ticket_type, 
  status,
  CASE 
    WHEN status = 'active' THEN '✅ Valid'
    WHEN status = 'used' THEN '⚠️ Already Used'
    WHEN status = 'inactive' THEN '❌ Invalid'
    ELSE '❓ Unknown'
  END as test_result
FROM tickets 
WHERE qr_code LIKE '%TICKET%' OR qr_code LIKE '%ANDIAMO%' OR qr_code LIKE '%GUEST%' OR qr_code LIKE '%VIP%' OR qr_code LIKE '%REGULAR%' OR qr_code LIKE '%SPECIAL%' OR qr_code LIKE '%TEST%' OR qr_code LIKE '%DEMO%' OR qr_code LIKE '%SAMPLE%' OR qr_code LIKE '%FAKE%' OR qr_code LIKE '%DUMMY%' OR qr_code LIKE '%INVALID%'
ORDER BY status, qr_code; 