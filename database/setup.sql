DROP TABLE IF EXISTS educational_sources;
DROP TABLE IF EXISTS emergency_services;
DROP TABLE IF EXISTS crime_areas;


CREATE TABLE emergency_services (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    h3 BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL
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
