const jwt = require("jsonwebtoken");
const { pool } = require("../db");

// Extrai e valida o JWT do header Authorization: Bearer <token>
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Não autenticado. Faça login novamente." });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      "SELECT id, name, email, role, status FROM users WHERE id = $1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user || user.status !== "ativo") {
      return res.status(401).json({ error: "Usuário inativo ou não encontrado." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

// Middleware de fábrica: exige permissão de "view" ou "edit" ou "delete"
// no módulo informado, de acordo com a matriz role_permissions.
function requirePermission(moduleKey, level = "can_view") {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado." });
    const { rows } = await pool.query(
      `SELECT ${level} AS allowed FROM role_permissions WHERE role = $1 AND module_key = $2`,
      [req.user.role, moduleKey]
    );
    if (!rows.length || !rows[0].allowed) {
      return res.status(403).json({
        error: `Seu perfil (${req.user.role}) não tem permissão de ${level.replace("can_", "")} em "${moduleKey}".`,
      });
    }
    next();
  };
}

module.exports = { requireAuth, requirePermission };
