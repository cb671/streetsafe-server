DROP TABLE IF EXISTS educational_sources;
DROP TABLE IF EXISTS emergency_services;

-- Try with CASCADE to auto-install dependencies
CREATE EXTENSION IF NOT EXISTS h3 CASCADE;
CREATE EXTENSION IF NOT EXISTS h3_postgis CASCADE;

CREATE TABLE emergency_services (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    url VARCHAR(255),
    h3 BIGINT NOT NULL
);

CREATE TABLE educational_sources (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    target_crime_type VARCHAR(50) NOT NULL,
    h3 BIGINT NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT now()
);
