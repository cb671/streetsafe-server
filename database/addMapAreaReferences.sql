CREATE TABLE map_area_references (
    area_number BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    h3_index h3index NOT NULL UNIQUE
);

INSERT INTO map_area_references (h3_index)
SELECT DISTINCT h3_cell_to_parent(h3::h3index, 9)
FROM crime_area
WHERE h3 IS NOT NULL
ON CONFLICT (h3_index) DO NOTHING;