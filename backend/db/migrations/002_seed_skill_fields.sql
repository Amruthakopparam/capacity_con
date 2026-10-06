INSERT INTO skill_fields (name) VALUES
  ('Python'),
  ('Java'),
  ('JavaScript'),
  ('Web Development'),
  ('Data Science'),
  ('Machine Learning'),
  ('Database Management'),
  ('Cloud Computing'),
  ('Cybersecurity'),
  ('Digital Marketing'),
  ('Oceanography')
ON CONFLICT (name) DO NOTHING;