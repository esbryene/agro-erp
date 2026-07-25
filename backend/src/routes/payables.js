const express = require("express");
const multer = require("multer");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { logAction } = require("../services/audit");
const { saveFile } = require("../services/storage");

const router = express.Router();
router.use(requireAuth);

const uploadBoleto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Recalcula o status de "vencido" para os títulos ainda não pagos —
// chamado antes de listar para manter o status sempre correto.
async function atualizarVencidos() {
  await pool.query(
    `UPDATE payables SET status = 'vencido'
     WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE`
  );
}

router.get("/", requirePermission("contas_pagar", "can_view"), async (req, res) => {
  await atualizarVencidos();
  const { status, supplier_id, from, to } = req.query;
  const clauses = [];
  const params = [];
  if (status) { params.push(status); clauses.push(`p.status = $${params.length}`); }
  if (supplier_id) { params.push(supplier_id); clauses.push(`p.supplier_id = $${params.length}`); }
  if (from) { params.push(from); clauses.push(`p.data_vencimento >= $${params.length}`); }
  if (to) { params.push(to); clauses.push(`p.data_vencimento <= $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT p.*, s.nome_fantasia, s.razao_social, fc.nome AS categoria, cc.nome AS centro_custo
     FROM payables p
     JOIN suppliers s ON s.id = p.supplier_id
     LEFT JOIN financial_categories fc ON fc.id = p.categoria_id
     LEFT JOIN cost_centers cc ON cc.id = p.centro_custo_id
     ${where} ORDER BY p.data_vencimento ASC`,
    params
  );
  res.json(rows);
});

router.post("/", requirePermission("contas_pagar", "can_edit"), async (req, res) => {
  const b = req.body || {};
  if (!b.supplier_id || !b.valor || !b.data_vencimento) {
    return res.status(400).json({ error: "Fornecedor, valor e vencimento são obrigatórios." });
  }
  const { rows } = await pool.query(
    `INSERT INTO payables
      (supplier_id, invoice_id, documento, numero_boleto, banco, linha_digitavel, codigo_barras,
       valor, data_emissao, data_vencimento, forma_pagamento, centro_custo_id, categoria_id, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [b.supplier_id, b.invoice_id, b.documento, b.numero_boleto, b.banco, b.linha_digitavel,
     b.codigo_barras, b.valor, b.data_emissao, b.data_vencimento, b.forma_pagamento,
     b.centro_custo_id, b.categoria_id, b.observacoes]
  );
  await logAction(req, { action: "create", entity: "boleto", entityId: rows[0].id });
  res.status(201).json(rows[0]);
});

// Gera N parcelas recorrentes a partir de uma regra (Módulo 5 do escopo original).
router.post("/recurring", requirePermission("contas_pagar", "can_edit"), async (req, res) => {
  const b = req.body || {};
  const { descricao, tipo, valor_parcela, quantidade_parcelas, primeiro_vencimento,
          supplier_id, categoria_id, centro_custo_id } = b;
  if (!descricao || !valor_parcela || !quantidade_parcelas || !primeiro_vencimento || !supplier_id) {
    return res.status(400).json({ error: "Descrição, valor, quantidade de parcelas, primeiro vencimento e fornecedor são obrigatórios." });
  }
  const intervalos = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
  const intervalo = intervalos[tipo] || Number(b.intervalo_meses) || 1;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: ruleRows } = await client.query(
      `INSERT INTO recurring_rules
        (descricao, tipo, intervalo_meses, valor_parcela, quantidade_parcelas, primeiro_vencimento, supplier_id, categoria_id, centro_custo_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [descricao, tipo || "personalizado", intervalo, valor_parcela, quantidade_parcelas,
       primeiro_vencimento, supplier_id, categoria_id, centro_custo_id]
    );
    const ruleId = ruleRows[0].id;

    const gerados = [];
    for (let n = 0; n < quantidade_parcelas; n++) {
      const venc = new Date(primeiro_vencimento);
      venc.setMonth(venc.getMonth() + n * intervalo);
      const { rows } = await client.query(
        `INSERT INTO payables (supplier_id, recurring_rule_id, documento, valor, data_vencimento, categoria_id, centro_custo_id, observacoes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [supplier_id, ruleId, `${descricao} — parcela ${n + 1}/${quantidade_parcelas}`, valor_parcela,
         venc.toISOString().slice(0, 10), categoria_id, centro_custo_id, `Gerado automaticamente (recorrência ${tipo}).`]
      );
      gerados.push(rows[0]);
    }
    await client.query("COMMIT");
    await logAction(req, { action: "create", entity: "recorrencia", entityId: ruleId, details: { parcelas: quantidade_parcelas } });
    res.status(201).json({ rule_id: ruleId, parcelas: gerados });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.put("/:id", requirePermission("contas_pagar", "can_edit"), async (req, res) => {
  const b = req.body || {};
  const campos = ["documento", "numero_boleto", "banco", "linha_digitavel", "codigo_barras", "valor",
    "data_emissao", "data_vencimento", "data_pagamento", "forma_pagamento", "centro_custo_id",
    "categoria_id", "observacoes", "status"];
  const cols = campos.filter((c) => b[c] !== undefined);
  if (!cols.length) return res.status(400).json({ error: "Nada para atualizar." });
  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const values = cols.map((c) => b[c]);
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE payables SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
  if (!rows.length) return res.status(404).json({ error: "Título não encontrado." });
  await logAction(req, { action: "update", entity: "boleto", entityId: req.params.id });
  res.json(rows[0]);
});

router.post("/:id/pagar", requirePermission("contas_pagar", "can_edit"), async (req, res) => {
  const { data_pagamento } = req.body || {};
  const { rows } = await pool.query(
    "UPDATE payables SET status = 'pago', data_pagamento = COALESCE($1, CURRENT_DATE) WHERE id = $2 RETURNING *",
    [data_pagamento, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Título não encontrado." });
  await logAction(req, { action: "update", entity: "boleto", entityId: req.params.id, details: { status: "pago" } });
  res.json(rows[0]);
});

router.post("/:id/anexo", requirePermission("contas_pagar", "can_edit"), uploadBoleto.single("arquivo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Envie um arquivo." });
  const rel = `boletos/${Date.now()}-${req.file.originalname}`;
  await saveFile(rel, req.file.buffer);
  await pool.query("UPDATE payables SET boleto_path = $1 WHERE id = $2", [rel, req.params.id]);
  await pool.query(
    "INSERT INTO attachments (entity_type, entity_id, tipo, path, original_name, uploaded_by) VALUES ('payable',$1,'comprovante',$2,$3,$4)",
    [req.params.id, rel, req.file.originalname, req.user.id]
  );
  res.json({ ok: true, path: rel });
});

router.delete("/:id", requirePermission("contas_pagar", "can_delete"), async (req, res) => {
  await pool.query("UPDATE payables SET status = 'cancelado' WHERE id = $1", [req.params.id]);
  await logAction(req, { action: "delete", entity: "boleto", entityId: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
