const { pool } = require("../db");

// Registra uma ação no log de auditoria (Módulo 12 do escopo original).
async function logAction(req, { action, entity, entityId, details }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, ip, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user ? req.user.id : null,
        action,
        entity,
        entityId != null ? String(entityId) : null,
        req.ip,
        req.headers["user-agent"] || null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (err) {
    // Auditoria nunca deve derrubar a requisição principal.
    console.error("[audit] falha ao gravar log:", err.message);
  }
}

module.exports = { logAction };
