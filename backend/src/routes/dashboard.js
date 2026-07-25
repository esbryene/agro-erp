const express = require("express");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/summary", requirePermission("dashboard", "can_view"), async (req, res) => {
  const [aPagar, pagoMes, vencido, hoje, sete, categorias, ultimasNotas] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(valor),0) AS total, COUNT(*) AS qtd FROM payables WHERE status IN ('pendente','vencido')`),
    pool.query(`SELECT COALESCE(SUM(valor),0) AS total FROM payables WHERE status = 'pago' AND date_trunc('month', data_pagamento) = date_trunc('month', CURRENT_DATE)`),
    pool.query(`SELECT COALESCE(SUM(valor),0) AS total, COUNT(*) AS qtd FROM payables WHERE status = 'vencido'`),
    pool.query(`SELECT COALESCE(SUM(valor),0) AS total, COUNT(*) AS qtd FROM payables WHERE status = 'pendente' AND data_vencimento = CURRENT_DATE`),
    pool.query(`SELECT p.*, s.nome_fantasia FROM payables p JOIN suppliers s ON s.id = p.supplier_id
                WHERE p.status IN ('pendente','vencido') AND p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                ORDER BY p.data_vencimento`),
    pool.query(`SELECT fc.nome AS categoria, COALESCE(SUM(p.valor),0) AS total
                FROM payables p LEFT JOIN financial_categories fc ON fc.id = p.categoria_id
                WHERE p.data_vencimento >= date_trunc('month', CURRENT_DATE - INTERVAL '5 months')
                GROUP BY fc.nome ORDER BY total DESC`),
    pool.query(`SELECT i.*, s.nome_fantasia FROM invoices i JOIN suppliers s ON s.id = i.supplier_id ORDER BY i.created_at DESC LIMIT 8`),
  ]);

  res.json({
    a_pagar_em_aberto: aPagar.rows[0],
    pago_no_mes: pagoMes.rows[0].total,
    vencido: vencido.rows[0],
    vence_hoje: hoje.rows[0],
    vence_proximos_7_dias: sete.rows,
    despesas_por_categoria: categorias.rows,
    ultimos_lancamentos: ultimasNotas.rows,
  });
});

module.exports = router;
