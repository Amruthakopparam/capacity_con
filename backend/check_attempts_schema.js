const pool = require('./config/database');

pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'skill_test_attempts'
`).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
});
