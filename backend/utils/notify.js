const pool = require("../config/database");

async function createNotification(userId, title, message, type = "info") {
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)`,
    [userId, title, message, type]
  );
}

module.exports = { createNotification };
