const express = require("express");
const multer = require("multer");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { logAction } = require("../services/audit");
const { parseExtrato } = require("../services/excelParser");
const { suggestMatches } = require("../services/reconciliation");

const router = express.Router();
router.use(requireAuth);

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (!ok) return cb(new Error("Envie um arquivo .xlsx, .xls ou .csv"));
    cb(null, true);
  },
});

const CLASSIFICACOES = [
  "Receita", "Devolução", "Fornecedor", "Energia", "Água", "Internet",
  "Telefone", "Tarifa bancária", "Transferência", "Não classificado",
];

router.get("/accounts", requirePermission("conciliacao", "can_view"), async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM bank_accounts ORDER BY id");
  res.json(rows);
});

router.post("/accounts", requirePermission("conciliacao", "can_edit"), async (req, res) => {
  const { nome_banco, agencia, conta, saldo_atual } = req.body || {};
  if (!nome_banco) return res.status(400).json({ error: "Informe o nome do banco." });
  const { rows } = await pool.query(
    `INSERT INTO bank_accounts (nome_banco, agencia, conta, saldo_atual) VALUES ($1,$2,$3,COALESCE($4,0)) RETURNING *`,
    [nome_banco, agencia, conta, saldo_atual]
  );
  res.status(201).json(rows[0]);
});

router.get("/accounts/:id/transactions", requirePermission("conciliacao", "can_view"), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT t.*, p.numero_boleto, p.data_vencimento AS payable_vencimento,
            s.nome_fantasia AS payable_fornecedor
     FROM bank_transactions t
     LEFT JOIN payables p ON p.id = t.payable_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE t.bank_account_id = $1
     ORDER BY t.data DESC, t.id DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// Importa o extrato em Excel/CSV, salva as linhas cruas e devolve também
// sugestões automáticas de vínculo com o contas a pagar.
router.post(
  "/accounts/:id/import",
  requirePermission("conciliacao", "can_edit"),
  uploadExcel.single("arquivo"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Envie o arquivo do extrato." });

    const { rows: accRows } = await pool.query("SELECT * FROM bank_accounts WHERE id = $1", [req.params.id]);
    if (!accRows.length) return res.status(404).json({ error: "Banco não encontrado." });

    let transacoes;
    try {
      transacoes = parseExtrato(req.file.buffer);
    } catch (err) {
      return res.status(422).json({ error: err.message });
    }
    if (!transacoes.length) {
      return res.status(422).json({ error: "Não encontrei lançamentos válidos nesse arquivo." });
    }

    const batchId = `${Date.now()}`;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inseridos = [];
      for (const tx of transacoes) {
        const classificacaoAuto = tx.tipo === "credito" ? "Receita" : "Não classificado";
        const { rows } = await client.query(
          `INSERT INTO bank_transactions
            (bank_account_id, data, descricao, tipo, valor, saldo, classificacao, import_batch)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [req.params.id, tx.data, tx.descricao, tx.tipo, tx.valor, tx.saldo, classificacaoAuto, batchId]
        );
        inseridos.push(rows[0]);
      }
      const ultimoSaldo = transacoes[transacoes.length - 1].saldo;
      if (ultimoSaldo != null) {
        await client.query("UPDATE bank_accounts SET saldo_atual = $1 WHERE id = $2", [ultimoSaldo, req.params.id]);
      }
      await client.query("COMMIT");

      const sugestoes = await suggestMatches(req.params.id);
      await logAction(req, {
        action: "create", entity: "extrato_bancario", entityId: req.params.id,
        details: { linhas: inseridos.length, arquivo: req.file.originalname },
      });
      res.status(201).json({ importadas: inseridos.length, transacoes: inseridos, sugestoes_conciliacao: sugestoes });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

router.get("/accounts/:id/sugestoes", requirePermission("conciliacao", "can_view"), async (req, res) => {
  const sugestoes = await suggestMatches(req.params.id);
  res.json(sugestoes);
});

router.patch("/transactions/:id", requirePermission("conciliacao", "can_edit"), async (req, res) => {
  const { classificacao } = req.body || {};
  if (classificacao && !CLASSIFICACOES.includes(classificacao)) {
    return res.status(400).json({ error: `Classificação inválida. Use uma de: ${CLASSIFICACOES.join(", ")}` });
  }
  const campos = [];
  const values = [];
  let i = 1;
  if (classificacao !== undefined) { campos.push(`classificacao = $${i++}`); values.push(classificacao); }
  if (!campos.length) return res.status(400).json({ error: "Nada para atualizar." });
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE bank_transactions SET ${campos.join(", ")} WHERE id = $${i} RETURNING *`, values);
  if (!rows.length) return res.status(404).json({ error: "Lançamento não encontrado." });
  res.json(rows[0]);
});

// Concilia (ou desfaz a conciliação) um lançamento do extrato, opcionalmente
// vinculando a um título específico do contas a pagar.
router.post("/transactions/:id/conciliar", requirePermission("conciliacao", "can_edit"), async (req, res) => {
  const { payable_id } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "UPDATE bank_transactions SET conciliado = TRUE, payable_id = $1 WHERE id = $2 RETURNING *",
      [payable_id || null, req.params.id]
    );
    if (!rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Lançamento não encontrado." }); }
    if (payable_id) {
      await client.query("UPDATE payables SET status = 'pago', data_pagamento = $1 WHERE id = $2", [rows[0].data, payable_id]);
    }
    await client.query("COMMIT");
    await logAction(req, { action: "update", entity: "extrato_bancario", entityId: req.params.id, details: { conciliado: true, payable_id } });
    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.post("/transactions/:id/desfazer", requirePermission("conciliacao", "can_edit"), async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE bank_transactions SET conciliado = FALSE, payable_id = NULL WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Lançamento não encontrado." });
  res.json(rows[0]);
});

module.exports = router;
