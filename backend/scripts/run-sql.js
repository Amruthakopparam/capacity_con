require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const pool = require("../config/database");

const sql = process.argv[2];

pool.query(sql)
  .then((result) => {
    console.log(result.rows && result.rows.length ? result.rows : `OK - ${result.rowCount} row(s) affected`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
