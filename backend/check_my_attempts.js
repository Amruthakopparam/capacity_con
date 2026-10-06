const pool = require('./config/database');

pool.query(`
  SELECT * FROM skill_test_attempts WHERE trainer_id = 20 ORDER BY id
`).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
});
