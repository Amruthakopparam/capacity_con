INSERT INTO skill_fields (name) VALUES
  ('Tropical Meteorology'),
  ('Ocean Observation and Information Services'),
  ('Coastal Research'),
  ('Marine Living Resources'),
  ('Ocean Technology'),
  ('Air Quality and Atmospheric Chemistry')
ON CONFLICT (name) DO NOTHING;