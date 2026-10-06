require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const pool = require("../config/database");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const constraintResult = await client.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'enrollments' AND con.contype = 'u'
    `);

    for (const row of constraintResult.rows) {
      await client.query(`ALTER TABLE enrollments DROP CONSTRAINT ${row.conname}`);
      console.log("Dropped constraint:", row.conname);
    }

    await client.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT enrollments_batch_trainee_unique UNIQUE (batch_id, trainee_id)
    `);

    await client.query("COMMIT");
    console.log("✅ Constraint migration complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed:", err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
