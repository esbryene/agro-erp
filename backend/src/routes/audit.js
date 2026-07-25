const express = require("express");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", requirePermission("auditoria", "can_view"), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.*, u.name AS usuario_nome, u.email AS usuario_email
     FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT 500`
  );
  res.json(rows);
});

module.exports = router;
