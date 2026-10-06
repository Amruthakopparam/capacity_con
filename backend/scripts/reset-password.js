require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcrypt");
const pool = require("../config/database");

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: node reset-password.js <email> <newPassword>");
  process.exit(1);
}

bcrypt.hash(newPassword, 10)
  .then((hash) => pool.query(
    "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, role",
    [hash, email.toLowerCase()]
  ))
  .then((result) => {
    if (result.rows.length === 0) {
      console.error("No user found with that email");
      process.exit(1);
    }
    console.log("Password updated for:", result.rows[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
