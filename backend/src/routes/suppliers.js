const express = require("express");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { logAction } = require("../services/audit");

const router = express.Router();
router.use(requireAuth);

const CAMPOS = [
  "razao_social", "nome_fantasia", "cnpj", "inscricao_estadual", "inscricao_municipal",
  "endereco", "numero", "complemento", "bairro", "cidade", "estado", "cep",
  "telefone", "whatsapp", "email", "contato_nome", "banco", "agencia", "conta", "pix",
  "observacoes", "status",
];

router.get("/", requirePermission("fornecedores", "can_view"), async (req, res) => {
  const { q } = req.query;
  let sql = `
    SELECT s.*,
      COALESCE((SELECT SUM(p.valor) FROM payables p WHERE p.supplier_id = s.id
                AND p.data_vencimento >= date_trunc('year', CURRENT_DATE)), 0) AS total_ano
    FROM suppliers s`;
  const params = [];
  if (q) {
    sql += ` WHERE s.razao_social ILIKE $1 OR s.nome_fantasia ILIKE $1 OR s.cnpj ILIKE $1`;
    params.push(`%${q}%`);
  }
  sql += " ORDER BY s.nome_fantasia NULLS LAST, s.razao_social";
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

router.get("/:id", requirePermission("fornecedores", "can_view"), async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM suppliers WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Fornecedor não encontrado." });

  const { rows: notas } = await pool.query(
    "SELECT id, numero, data_emissao, valor_total, status FROM invoices WHERE supplier_id = $1 ORDER BY data_emissao DESC",
    [req.params.id]
  );
  const { rows: boletos } = await pool.query(
    "SELECT id, numero_boleto, data_vencimento, valor, status FROM payables WHERE supplier_id = $1 ORDER BY data_vencimento DESC",
    [req.params.id]
  );
  res.json({ ...rows[0], historico_notas: notas, historico_pagamentos: boletos });
});

router.post("/", requirePermission("fornecedores", "can_edit"), async (req, res) => {
  const body = req.body || {};
  if (!body.razao_social || !body.cnpj) {
    return res.status(400).json({ error: "Razão social e CNPJ são obrigatórios." });
  }
  const cols = CAMPOS.filter((c) => body[c] !== undefined);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => body[c]);
  try {
    const { rows } = await pool.query(
      `INSERT INTO suppliers (${cols.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`,
      values
    );
    await logAction(req, { action: "create", entity: "fornecedor", entityId: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Já existe fornecedor com esse CNPJ." });
    throw err;
  }
});

router.put("/:id", requirePermission("fornecedores", "can_edit"), async (req, res) => {
  const body = req.body || {};
  const cols = CAMPOS.filter((c) => body[c] !== undefined);
  if (!cols.length) return res.status(400).json({ error: "Nada para atualizar." });
  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const values = cols.map((c) => body[c]);
  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE suppliers SET ${setClause}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: "Fornecedor não encontrado." });
  await logAction(req, { action: "update", entity: "fornecedor", entityId: req.params.id });
  res.json(rows[0]);
});

router.delete("/:id", requirePermission("fornecedores", "can_delete"), async (req, res) => {
  await pool.query("UPDATE suppliers SET status = 'inativo' WHERE id = $1", [req.params.id]);
  await logAction(req, { action: "delete", entity: "fornecedor", entityId: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
