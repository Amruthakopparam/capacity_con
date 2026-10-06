CREATE TABLE skill_test_questions (
  id              SERIAL PRIMARY KEY,
  field_id        INTEGER NOT NULL REFERENCES skill_fields(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  option_a        VARCHAR(255) NOT NULL,
  option_b        VARCHAR(255) NOT NULL,
  option_c        VARCHAR(255) NOT NULL,
  option_d        VARCHAR(255) NOT NULL,
  correct_option  CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_skill_test_questions_field ON skill_test_questions(field_id);

CREATE TABLE skill_test_attempts (
  id                SERIAL PRIMARY KEY,
  trainer_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_id          INTEGER NOT NULL REFERENCES skill_fields(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at      TIMESTAMPTZ,
  score             INTEGER,
  total_questions   INTEGER NOT NULL,
  passed            BOOLEAN,
  time_limit_minutes INTEGER NOT NULL DEFAULT 20
);
CREATE INDEX idx_skill_test_attempts_trainer ON skill_test_attempts(trainer_id);

CREATE TABLE skill_test_attempt_questions (
  attempt_id    INTEGER NOT NULL REFERENCES skill_test_attempts(id) ON DELETE CASCADE,
  question_id   INTEGER NOT NULL REFERENCES skill_test_questions(id) ON DELETE CASCADE,
  option_order  JSONB NOT NULL,
  PRIMARY KEY (attempt_id, question_id)
);