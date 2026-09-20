ALTER TABLE users
    ADD COLUMN IF NOT EXISTS location_type TEXT
        CHECK (location_type IN ('full', 'outward')),
    ADD COLUMN IF NOT EXISTS outward_code TEXT;