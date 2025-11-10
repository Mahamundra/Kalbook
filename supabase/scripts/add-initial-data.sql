-- Add initial services and workers for your business
-- Replace 'f1b473bb-47c3-49e1-b4b4-2d8d55663e43' with your actual business_id

-- Insert services
INSERT INTO services (business_id, name, description, category, duration, price, tax_rate, active)
VALUES
  ('f1b473bb-47c3-49e1-b4b4-2d8d55663e43', 'Haircut', 'Standard haircut', 'Hair', 30, 25.00, 0, true),
  ('f1b473bb-47c3-49e1-b4b4-2d8d55663e43', 'Beard Trim', 'Professional beard trimming', 'Beard', 20, 15.00, 0, true),
  ('f1b473bb-47c3-49e1-b4b4-2d8d55663e43', 'Haircut + Beard', 'Complete grooming package', 'Package', 45, 35.00, 0, true),
  ('f1b473bb-47c3-49e1-b4b4-2d8d55663e43', 'Shave', 'Traditional hot towel shave', 'Shave', 25, 20.00, 0, true)
RETURNING id, name;

-- Insert workers
INSERT INTO workers (business_id, name, email, phone, active, color)
VALUES
  ('f1b473bb-47c3-49e1-b4b4-2d8d55663e43', 'John Smith', 'john@demo-barbershop.com', '+1234567891', true, '#3B82F6'),
  ('f1b473bb-47c3-49e1-b4b4-2d8d55663e43', 'Mike Johnson', 'mike@demo-barbershop.com', '+1234567892', true, '#10B981'),
  ('f1b473bb-47c3-49e1-b4b4-2d8d55663e43', 'David Williams', 'david@demo-barbershop.com', '+1234567893', true, '#F59E0B')
RETURNING id, name;

-- Link workers to services (all workers can provide all services)
-- Note: You'll need to replace the service_ids and worker_ids with actual IDs from above
-- Or run this after the above inserts and adjust the IDs

-- Example (replace with actual IDs):
-- INSERT INTO worker_services (worker_id, service_id)
-- SELECT w.id, s.id
-- FROM workers w, services s
-- WHERE w.business_id = 'f1b473bb-47c3-49e1-b4b4-2d8d55663e43'
--   AND s.business_id = 'f1b473bb-47c3-49e1-b4b4-2d8d55663e43';

-- Better: Link all workers to all services automatically
INSERT INTO worker_services (worker_id, service_id)
SELECT w.id, s.id
FROM workers w
CROSS JOIN services s
WHERE w.business_id = 'f1b473bb-47c3-49e1-b4b4-2d8d55663e43'
  AND s.business_id = 'f1b473bb-47c3-49e1-b4b4-2d8d55663e43';





