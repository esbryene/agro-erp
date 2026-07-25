const express = require("express");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n");
}

const QUERIES = {
  contas_por_fornecedor: `
    SELECT s.nome_fantasia AS fornecedor, COUNT(p.id) AS titulos, SUM(p.valor) AS total
    FROM payables p JOIN suppliers s ON s.id = p.supplier_id
    GROUP BY s.nome_fantasia ORDER BY total DESC`,
  despesas_por_mes: `
    SELECT to_char(date_trunc('month', data_vencimento), 'YYYY-MM') AS mes, SUM(valor) AS total
    FROM payables GROUP BY 1 ORDER BY 1`,
  despesas_por_categoria: `
    SELECT COALESCE(fc.nome, 'Sem categoria') AS categoria, SUM(p.valor) AS total
    FROM payables p LEFT JOIN financial_categories fc ON fc.id = p.categoria_id
    GROUP BY 1 ORDER BY total DESC`,
  notas_fiscais: `
    SELECT i.numero, s.nome_fantasia AS fornecedor, i.data_emissao, i.valor_total, i.status
    FROM invoices i JOIN suppliers s ON s.id = i.supplier_id ORDER BY i.data_emissao DESC`,
  boletos: `
    SELECT p.numero_boleto, s.nome_fantasia AS fornecedor, p.data_vencimento, p.valor, p.status
    FROM payables p JOIN suppliers s ON s.id = p.supplier_id ORDER BY p.data_vencimento DESC`,
  pagamentos: `
    SELECT p.numero_boleto, s.nome_fantasia AS fornecedor, p.data_pagamento, p.valor
    FROM payables p JOIN suppliers s ON s.id = p.supplier_id WHERE p.status = 'pago' ORDER BY p.data_pagamento DESC`,
  contas_vencidas: `
    SELECT p.numero_boleto, s.nome_fantasia AS fornecedor, p.data_vencimento, p.valor
    FROM payables p JOIN suppliers s ON s.id = p.supplier_id WHERE p.status = 'vencido' ORDER BY p.data_vencimento`,
  contas_a_vencer: `
    SELECT p.numero_boleto, s.nome_fantasia AS fornecedor, p.data_vencimento, p.valor
    FROM payables p JOIN suppliers s ON s.id = p.supplier_id WHERE p.status = 'pendente' ORDER BY p.data_vencimento`,
  fluxo_de_caixa: `
    SELECT to_char(date_trunc('month', data_vencimento), 'YYYY-MM') AS mes, SUM(valor) AS saida
    FROM payables GROUP BY 1 ORDER BY 1`,
};

router.get("/:tipo", requirePermission("relatorios", "can_view"), async (req, res) => {
  const sql = QUERIES[req.params.tipo];
  if (!sql) return res.status(404).json({ error: "Relatório desconhecido." });
  const { rows } = await pool.query(sql);
  const format = req.query.format || "json";
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.tipo}.csv"`);
    return res.send(toCsv(rows));
  }
  res.json(rows);
});

module.exports = router;
