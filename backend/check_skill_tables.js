const pool = require('./config/database');

pool.query(`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name LIKE '%skill%'
`).then(async (res) => {
  console.log("Tables matching 'skill':", JSON.stringify(res.rows, null, 2));
  pool.end();
});
