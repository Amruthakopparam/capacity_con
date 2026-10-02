-- Replace the generic starter fields with Earth Science fields.
-- Safe now because only test data references them (no test questions exist yet).
DELETE FROM trainer_fields
WHERE field_id IN (
  SELECT id FROM skill_fields
  WHERE name IN (
    'Python', 'Java', 'JavaScript', 'Web Development', 'Data Science',
    'Machine Learning', 'Database Management', 'Cloud Computing',
    'Cybersecurity', 'Digital Marketing'
  )
);

DELETE FROM skill_fields
WHERE name IN (
  'Python', 'Java', 'JavaScript', 'Web Development', 'Data Science',
  'Machine Learning', 'Database Management', 'Cloud Computing',
  'Cybersecurity', 'Digital Marketing'
);

INSERT INTO skill_fields (name) VALUES
  ('Meteorology'),
  ('Weather Forecasting'),
  ('Numerical Weather Prediction'),
  ('Climatology'),
  ('Climate Change and Adaptation'),
  ('Oceanography'),
  ('Hydrology'),
  ('Geology'),
  ('Geophysics'),
  ('Seismology'),
  ('Remote Sensing and GIS'),
  ('Atmospheric Science'),
  ('Polar Science'),
  ('Disaster Risk Management'),
  ('Environmental Science'),
  ('Data Analysis for Earth Sciences')
ON CONFLICT (name) DO NOTHING;