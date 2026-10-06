const pool = require('./config/database');

pool.query(`
  SELECT u.id, u.name, u.email, tp.verification_status
  FROM users u
  JOIN trainer_profiles tp ON tp.user_id = u.id
  WHERE u.role = 'trainer'
`).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
});
