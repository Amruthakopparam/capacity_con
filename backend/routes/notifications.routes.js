const express = require("express");
const router = express.Router();

const {
  listNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notifications.controller");

const { verifyToken } = require("../middleware/auth");

router.use(verifyToken);

router.get("/", listNotifications);
router.post("/:id/read", markAsRead);
router.post("/read-all", markAllAsRead);

module.exports = router;
