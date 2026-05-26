-- Data Anonymization / Masking Script
-- Scrub PII from Staging Database

BEGIN;

-- Mask user emails
UPDATE users 
SET email = 'user_' || id || '@example.com'
WHERE email IS NOT NULL;

-- Mask user names
UPDATE users 
SET first_name = 'Staging',
    last_name = 'User_' || id
WHERE first_name IS NOT NULL;

-- Mask phone numbers
UPDATE users 
SET phone_number = '+1555000' || LPAD(id::text, 4, '0')
WHERE phone_number IS NOT NULL;

-- Mask addresses (if applicable)
-- UPDATE user_profiles SET address = '123 Staging St', city = 'Staging City', zip_code = '00000';

COMMIT;

echo 'PII masking applied successfully.';
