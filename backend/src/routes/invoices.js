const express = require("express");
const multer = require("multer");
const { pool } = require("../db");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { logAction } = require("../services/audit");
const { parseNfeXml } = require("../services/xmlParser");
const { saveFile } = require("../services/storage");

const router = express.Router();
router.use(requireAuth);

const uploadXml = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".xml")) {
      return cb(new Error("Envie um arquivo .xml de NF-e."));
    }
    cb(null, true);
  },
});

router.get("/", requirePermission("notas", "can_view"), async (req, res) => {
  const { status, supplier_id } = req.query;
  const clauses = [];
  const params = [];
  if (status) { params.push(status); clauses.push(`i.status = $${params.length}`); }
  if (supplier_id) { params.push(supplier_id); clauses.push(`i.supplier_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT i.*, s.nome_fantasia, s.razao_social
     FROM invoices i JOIN suppliers s ON s.id = i.supplier_id
     ${where} ORDER BY i.data_emissao DESC NULLS LAST, i.id DESC`,
    params
  );
  res.json(rows);
});

router.get("/:id", requirePermission("notas", "can_view"), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.*, s.nome_fantasia, s.razao_social FROM invoices i
     JOIN suppliers s ON s.id = i.supplier_id WHERE i.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Nota não encontrada." });
  const { rows: itens } = await pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [req.params.id]);
  res.json({ ...rows[0], itens });
});

// Importação de XML de NF-e: cria (ou reaproveita) o fornecedor pelo CNPJ,
// cria a nota e seus itens automaticamente a partir do XML.
router.post(
  "/import-xml",
  requirePermission("notas", "can_edit"),
  uploadXml.single("xml"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Envie o arquivo XML." });

    let dados;
    try {
      dados = await parseNfeXml(req.file.buffer);
    } catch (err) {
      return res.status(422).json({ error: `Não consegui ler o XML: ${err.message}` });
    }

    const xmlRelPath = `xml/${Date.now()}-${req.file.originalname}`;
    await saveFile(xmlRelPath, req.file.buffer);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let { rows: existing } = await client.query(
        "SELECT id FROM suppliers WHERE cnpj = $1",
        [dados.emitente.cnpj]
      );
      let supplierId;
      if (existing.length) {
        supplierId = existing[0].id;
      } else {
        const ins = await client.query(
          `INSERT INTO suppliers (razao_social, nome_fantasia, cnpj, endereco, numero, bairro, cidade, estado, cep, telefone)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [
            dados.emitente.razao_social, dados.emitente.nome_fantasia, dados.emitente.cnpj,
            dados.emitente.endereco, dados.emitente.numero, dados.emitente.bairro,
            dados.emitente.cidade, dados.emitente.estado, dados.emitente.cep, dados.emitente.telefone,
          ]
        );
        supplierId = ins.rows[0].id;
      }

      const { rows: invRows } = await client.query(
        `INSERT INTO invoices
          (supplier_id, numero, serie, chave_nfe, data_emissao, valor_produtos, frete, seguro,
           desconto, outras_despesas, valor_total, status, xml_path)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pendente',$12)
         ON CONFLICT (chave_nfe) DO NOTHING
         RETURNING *`,
        [
          supplierId, dados.numero, dados.serie, dados.chave_nfe, dados.data_emissao,
          dados.valores.valor_produtos, dados.valores.frete, dados.valores.seguro,
          dados.valores.desconto, dados.valores.outras_despesas, dados.valores.valor_total,
          xmlRelPath,
        ]
      );

      if (!invRows.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Essa nota (mesma chave de acesso) já foi importada antes." });
      }
      const invoice = invRows[0];

      for (const item of dados.itens) {
        await client.query(
          `INSERT INTO invoice_items
            (invoice_id, codigo, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, cfop, ean)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [invoice.id, item.codigo, item.descricao, item.quantidade, item.unidade,
           item.valor_unitario, item.valor_total, item.ncm, item.cfop, item.ean]
        );
      }

      await client.query("COMMIT");
      await logAction(req, { action: "create", entity: "nota_fiscal", entityId: invoice.id, details: { origem: "xml" } });
      res.status(201).json({ ...invoice, itens: dados.itens, fornecedor_criado: !existing.length });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
);

// Lançamento manual (sem XML)
router.post("/", requirePermission("notas", "can_edit"), async (req, res) => {
  const b = req.body || {};
  if (!b.supplier_id || !b.numero) return res.status(400).json({ error: "Fornecedor e número da nota são obrigatórios." });
  const { rows } = await pool.query(
    `INSERT INTO invoices
      (supplier_id, numero, serie, data_emissao, data_entrada, valor_produtos, frete, seguro, desconto,
       outras_despesas, valor_total, observacoes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,'pendente')) RETURNING *`,
    [b.supplier_id, b.numero, b.serie, b.data_emissao, b.data_entrada, b.valor_produtos || 0,
     b.frete || 0, b.seguro || 0, b.desconto || 0, b.outras_despesas || 0,
     b.valor_total || 0, b.observacoes, b.status]
  );
  for (const item of b.itens || []) {
    await pool.query(
      `INSERT INTO invoice_items (invoice_id, codigo, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, cfop, ean, marca, categoria)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [rows[0].id, item.codigo, item.descricao, item.quantidade, item.unidade, item.valor_unitario,
       item.valor_total, item.ncm, item.cfop, item.ean, item.marca, item.categoria]
    );
  }
  await logAction(req, { action: "create", entity: "nota_fiscal", entityId: rows[0].id, details: { origem: "manual" } });
  res.status(201).json(rows[0]);
});

router.put("/:id/status", requirePermission("notas", "can_edit"), async (req, res) => {
  const { status } = req.body || {};
  if (!["pendente", "conferida", "paga"].includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }
  const { rows } = await pool.query("UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *", [status, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Nota não encontrada." });
  await logAction(req, { action: "update", entity: "nota_fiscal", entityId: req.params.id, details: { status } });
  res.json(rows[0]);
});

router.delete("/:id", requirePermission("notas", "can_delete"), async (req, res) => {
  await pool.query("DELETE FROM invoices WHERE id = $1", [req.params.id]);
  await logAction(req, { action: "delete", entity: "nota_fiscal", entityId: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
