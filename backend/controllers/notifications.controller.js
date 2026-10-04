const pool = require("../config/database");

// GET /api/notifications
async function listNotifications(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const unreadCount = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({
      notifications: result.rows,
      unreadCount: Number(unreadCount.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error loading notifications" });
  }
}

// POST /api/notifications/:id/read
async function markAsRead(req, res) {
  try {
    const userId = req.user.userId;
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const result = await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error updating notification" });
  }
}

// POST /api/notifications/read-all
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.userId;

    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error updating notifications" });
  }
}

module.exports = { listNotifications, markAsRead, markAllAsRead };
