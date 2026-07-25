const express = require("express");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { logAction } = require("../services/audit");

const router = express.Router();
router.use(requireAuth);

// Mantém o status em dia (a_vencer / hoje / vencida) para quem ainda não recebeu.
async function atualizarStatus() {
  await pool.query(`
    UPDATE receivables SET status = CASE
      WHEN data_vencimento < CURRENT_DATE THEN 'vencida'
      WHEN data_vencimento = CURRENT_DATE THEN 'hoje'
      ELSE 'a_vencer'
    END
    WHERE status <> 'paga'
  `);
}

router.get("/", requirePermission("contas_receber", "can_view"), async (req, res) => {
  await atualizarStatus();
  const { status } = req.query;
  const params = [];
  let where = "";
  if (status) { params.push(status); where = "WHERE r.status = $1"; }
  const { rows } = await pool.query(
    `SELECT r.*, c.nome AS cliente_nome, c.cpf, c.telefone, c.endereco
     FROM receivables r JOIN customers c ON c.id = r.customer_id
     ${where} ORDER BY r.data_vencimento ASC`,
    params
  );
  res.json(rows);
});

router.get("/:id", requirePermission("contas_receber", "can_view"), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, c.nome AS cliente_nome, c.cpf, c.telefone, c.endereco
     FROM receivables r JOIN customers c ON c.id = r.customer_id WHERE r.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Registro não encontrado." });
  const { rows: itens } = await pool.query("SELECT * FROM receivable_items WHERE receivable_id = $1", [req.params.id]);
  res.json({ ...rows[0], itens });
});

// Cria uma venda a prazo: cliente (novo ou existente), itens e vencimento
// automático de 30 dias (ou outro prazo informado) a partir da data da venda.
router.post("/", requirePermission("contas_receber", "can_edit"), async (req, res) => {
  const b = req.body || {};
  if (!b.itens || !b.itens.length) return res.status(400).json({ error: "Informe ao menos um item vendido." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let customerId = b.customer_id;
    if (!customerId) {
      if (!b.cliente || !b.cliente.nome) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Informe o cliente (nome, CPF, endereço e telefone) ou um customer_id existente." });
      }
      const { nome, cpf, endereco, telefone, email } = b.cliente;
      const ins = await client.query(
        `INSERT INTO customers (nome, cpf, endereco, telefone, email)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (cpf) DO UPDATE SET nome = EXCLUDED.nome
         RETURNING id`,
        [nome, cpf, endereco, telefone, email]
      );
      customerId = ins.rows[0].id;
    }

    const prazoDias = Number(b.prazo_dias) || 30;
    const dataVenda = b.data_venda || new Date().toISOString().slice(0, 10);
    const valorTotal = b.itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.valor_unitario), 0);

    const { rows: recRows } = await client.query(
      `INSERT INTO receivables (customer_id, data_venda, data_vencimento, prazo_dias, valor_total, observacoes)
       VALUES ($1, $2, ($2::date + $3 * INTERVAL '1 day'), $3, $4, $5) RETURNING *`,
      [customerId, dataVenda, prazoDias, valorTotal, b.observacoes]
    );
    const receivable = recRows[0];

    for (const item of b.itens) {
      await client.query(
        `INSERT INTO receivable_items (receivable_id, descricao, quantidade, valor_unitario)
         VALUES ($1,$2,$3,$4)`,
        [receivable.id, item.descricao, item.quantidade, item.valor_unitario]
      );
    }

    await client.query("COMMIT");
    await logAction(req, { action: "create", entity: "conta_receber", entityId: receivable.id });
    res.status(201).json({ ...receivable, itens: b.itens });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.post("/:id/receber", requirePermission("contas_receber", "can_edit"), async (req, res) => {
  const { data_recebimento } = req.body || {};
  const { rows } = await pool.query(
    "UPDATE receivables SET status = 'paga', data_recebimento = COALESCE($1, CURRENT_DATE) WHERE id = $2 RETURNING *",
    [data_recebimento, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Registro não encontrado." });
  await logAction(req, { action: "update", entity: "conta_receber", entityId: req.params.id, details: { status: "paga" } });
  res.json(rows[0]);
});

router.delete("/:id", requirePermission("contas_receber", "can_delete"), async (req, res) => {
  await pool.query("DELETE FROM receivables WHERE id = $1", [req.params.id]);
  await logAction(req, { action: "delete", entity: "conta_receber", entityId: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
