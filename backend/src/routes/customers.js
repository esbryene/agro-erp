const express = require("express");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { logAction } = require("../services/audit");

const router = express.Router();
router.use(requireAuth);

router.get("/", requirePermission("contas_receber", "can_view"), async (req, res) => {
  const { q } = req.query;
  let sql = "SELECT * FROM customers";
  const params = [];
  if (q) { sql += " WHERE nome ILIKE $1 OR cpf ILIKE $1"; params.push(`%${q}%`); }
  sql += " ORDER BY nome";
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

router.post("/", requirePermission("contas_receber", "can_edit"), async (req, res) => {
  const { nome, cpf, endereco, telefone, email, observacoes } = req.body || {};
  if (!nome) return res.status(400).json({ error: "Nome do cliente é obrigatório." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO customers (nome, cpf, endereco, telefone, email, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nome, cpf, endereco, telefone, email, observacoes]
    );
    await logAction(req, { action: "create", entity: "cliente", entityId: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Já existe cliente com esse CPF." });
    throw err;
  }
});

router.put("/:id", requirePermission("contas_receber", "can_edit"), async (req, res) => {
  const campos = ["nome", "cpf", "endereco", "telefone", "email", "observacoes"];
  const b = req.body || {};
  const cols = campos.filter((c) => b[c] !== undefined);
  if (!cols.length) return res.status(400).json({ error: "Nada para atualizar." });
  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const values = cols.map((c) => b[c]);
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE customers SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
  if (!rows.length) return res.status(404).json({ error: "Cliente não encontrado." });
  await logAction(req, { action: "update", entity: "cliente", entityId: req.params.id });
  res.json(rows[0]);
});

router.delete("/:id", requirePermission("contas_receber", "can_delete"), async (req, res) => {
  await pool.query("DELETE FROM customers WHERE id = $1", [req.params.id]);
  await logAction(req, { action: "delete", entity: "cliente", entityId: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
