CREATE TYPE verification_status AS ENUM (
  'profile_incomplete',
  'pending_review',
  'rejected',
  'test_pending',
  'test_in_progress',
  'test_failed',
  'verified'
);

CREATE TABLE skill_fields (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trainer_profiles (
  user_id              INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  verification_status  verification_status NOT NULL DEFAULT 'profile_incomplete',
  resume_path          TEXT,
  resume_original_name TEXT,
  resume_uploaded_at   TIMESTAMPTZ,
  submitted_at         TIMESTAMPTZ,
  reviewed_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  review_reason        TEXT,
  verified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_trainer_profiles_status ON trainer_profiles(verification_status);

CREATE TABLE trainer_fields (
  trainer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_id    INTEGER NOT NULL REFERENCES skill_fields(id) ON DELETE RESTRICT,
  test_status VARCHAR(20) NOT NULL DEFAULT 'not_taken'
              CHECK (test_status IN ('not_taken', 'passed', 'failed')),
  PRIMARY KEY (trainer_id, field_id)
);

CREATE TABLE work_experiences (
  id           SERIAL PRIMARY KEY,
  trainer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_title   VARCHAR(150) NOT NULL,
  organization VARCHAR(150) NOT NULL,
  years        NUMERIC(4,1) NOT NULL CHECK (years >= 0 AND years <= 60),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existing trainers get a profile row.
-- Trainers who are already active (your two working test trainers) are marked verified
-- so their existing courses keep working. All other trainers start at profile_incomplete.
INSERT INTO trainer_profiles (user_id, verification_status, verified_at)
SELECT
  id,
  CASE WHEN status = 'active' THEN 'verified'::verification_status
       ELSE 'profile_incomplete'::verification_status END,
  CASE WHEN status = 'active' THEN NOW() END
FROM users
WHERE role = 'trainer'
ON CONFLICT (user_id) DO NOTHING;

-- Trainers and trainees can log in; verification is tracked separately now
UPDATE users SET status = 'active'
WHERE role IN ('trainer', 'trainee') AND status = 'pending';