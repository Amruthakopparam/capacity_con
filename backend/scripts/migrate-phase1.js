require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const pool = require("../config/database");

const statements = [
  `CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES batches(id)`,

  `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES batches(id)`,
  `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS week_number INTEGER`,

  `CREATE TABLE IF NOT EXISTS main_tests (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_questions INTEGER,
    pass_percentage NUMERIC(5,2) NOT NULL DEFAULT 70,
    created_by INTEGER REFERENCES users(id),
    reviewed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    UNIQUE(batch_id)
  )`,

  `CREATE TABLE IF NOT EXISTS main_test_questions (
    id SERIAL PRIMARY KEY,
    main_test_id INTEGER NOT NULL REFERENCES main_tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) NOT NULL,
    marks INTEGER NOT NULL DEFAULT 1,
    added_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS main_test_attempts (
    id SERIAL PRIMARY KEY,
    main_test_id INTEGER NOT NULL REFERENCES main_tests(id) ON DELETE CASCADE,
    trainee_id INTEGER NOT NULL REFERENCES users(id),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP,
    score INTEGER,
    total_questions INTEGER,
    passed BOOLEAN,
    UNIQUE(main_test_id, trainee_id)
  )`,

  `CREATE TABLE IF NOT EXISTS main_test_attempt_questions (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES main_test_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES main_test_questions(id),
    option_order JSONB NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS certificate_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    file_path TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    name_x INTEGER NOT NULL DEFAULT 400,
    name_y INTEGER NOT NULL DEFAULT 300,
    course_x INTEGER NOT NULL DEFAULT 400,
    course_y INTEGER NOT NULL DEFAULT 400,
    date_x INTEGER NOT NULL DEFAULT 400,
    date_y INTEGER NOT NULL DEFAULT 500,
    font_size INTEGER NOT NULL DEFAULT 24,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES batches(id)`,
  `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES certificate_templates(id)`,
  `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS main_test_attempt_id INTEGER REFERENCES main_test_attempts(id)`,
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const sql of statements) {
      console.log("Running:", sql.split("\n")[0].slice(0, 70), "...");
      await client.query(sql);
    }
    await client.query("COMMIT");
    console.log("✅ Phase 1 migration complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
