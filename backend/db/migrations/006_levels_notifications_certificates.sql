ALTER TABLE courses
  ADD COLUMN level VARCHAR(20) NOT NULL DEFAULT 'beginner'
  CHECK (level IN ('beginner', 'intermediate', 'advanced'));

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);

CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  trainee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_path TEXT,
  UNIQUE(trainee_id, course_id)
);
