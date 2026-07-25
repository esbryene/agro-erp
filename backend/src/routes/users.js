const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { logAction } = require("../services/audit");

const router = express.Router();
router.use(requireAuth);

// Lista usuários (sem o hash de senha)
router.get("/", requirePermission("usuarios", "can_view"), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, cpf, telefone, cargo, departamento, role, status, foto_url, last_login_at, created_at
     FROM users ORDER BY name`
  );
  res.json(rows);
});

router.post("/", requirePermission("usuarios", "can_edit"), async (req, res) => {
  const { name, email, cpf, telefone, cargo, departamento, role, password, status } = req.body || {};
  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: "Nome, e-mail, perfil e senha são obrigatórios." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres." });
  }
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, cpf, telefone, cargo, departamento, role, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'ativo'))
       RETURNING id, name, email, role, status`,
      [name, email.toLowerCase().trim(), hash, cpf, telefone, cargo, departamento, role, status]
    );
    await logAction(req, { action: "create", entity: "usuario", entityId: rows[0].id, details: { email } });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Já existe um usuário com esse e-mail." });
    throw err;
  }
});

router.put("/:id", requirePermission("usuarios", "can_edit"), async (req, res) => {
  const { name, cpf, telefone, cargo, departamento, role, status, password } = req.body || {};
  const fields = [];
  const values = [];
  let i = 1;
  const set = (col, val) => { fields.push(`${col} = $${i++}`); values.push(val); };

  if (name !== undefined) set("name", name);
  if (cpf !== undefined) set("cpf", cpf);
  if (telefone !== undefined) set("telefone", telefone);
  if (cargo !== undefined) set("cargo", cargo);
  if (departamento !== undefined) set("departamento", departamento);
  if (role !== undefined) set("role", role);
  if (status !== undefined) set("status", status);
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres." });
    set("password_hash", await bcrypt.hash(password, 12));
  }
  if (fields.length === 0) return res.status(400).json({ error: "Nada para atualizar." });

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING id, name, email, role, status`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });
  await logAction(req, { action: "update", entity: "usuario", entityId: req.params.id });
  res.json(rows[0]);
});

router.delete("/:id", requirePermission("usuarios", "can_delete"), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "Você não pode excluir seu próprio usuário." });
  }
  await pool.query("UPDATE users SET status = 'inativo' WHERE id = $1", [req.params.id]);
  await logAction(req, { action: "delete", entity: "usuario", entityId: req.params.id });
  res.json({ ok: true, info: "Usuário inativado (soft delete) para preservar o histórico de auditoria." });
});

// Matriz de permissões — leitura e atualização (só administrador via can_edit em 'usuarios')
router.get("/permissions/matrix", requirePermission("usuarios", "can_view"), async (req, res) => {
  const { rows: roles } = await pool.query("SELECT key, label FROM roles ORDER BY key");
  const { rows: modules } = await pool.query("SELECT key, label FROM modules ORDER BY key");
  const { rows: perms } = await pool.query("SELECT * FROM role_permissions");
  res.json({ roles, modules, permissions: perms });
});

router.put("/permissions/matrix", requirePermission("usuarios", "can_edit"), async (req, res) => {
  const { entries } = req.body || {}; // [{ role, module_key, can_view, can_edit, can_delete }]
  if (!Array.isArray(entries)) return res.status(400).json({ error: "Formato inválido." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const e of entries) {
      await client.query(
        `INSERT INTO role_permissions (role, module_key, can_view, can_edit, can_delete)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (role, module_key) DO UPDATE SET can_view=$3, can_edit=$4, can_delete=$5`,
        [e.role, e.module_key, !!e.can_view, !!e.can_edit, !!e.can_delete]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await logAction(req, { action: "update", entity: "permissoes", details: { count: entries.length } });
  res.json({ ok: true });
});

module.exports = router;
