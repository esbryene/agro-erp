const XLSX = require("xlsx");

// Tenta reconhecer as colunas mais comuns de um extrato bancário exportado
// em Excel/CSV: data, descrição/histórico, valor (ou débito/crédito
// separados) e saldo. Não depende de um layout fixo de banco.
const HEADER_ALIASES = {
  data: ["data", "dt", "data lancamento", "data lançamento", "date"],
  descricao: ["descricao", "descrição", "historico", "histórico", "lancamento", "lançamento", "description", "memo"],
  valor: ["valor", "amount", "vlr"],
  credito: ["credito", "crédito", "entrada", "credit"],
  debito: ["debito", "débito", "saida", "saída", "debit"],
  saldo: ["saldo", "balance"],
};

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase();
}

function findColumn(headers, aliases) {
  const idx = headers.findIndex((h) => aliases.includes(normalizeHeader(h)));
  return idx;
}

function parseBrDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    let [, d, m, y] = br;
    if (y.length === 2) y = `20${y}`;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return s.slice(0, 10);
  return null;
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (value == null || value === "") return 0;
  let s = String(value).trim();
  // formatos "1.234,56" (pt-BR) e "-1.234,56"
  const negative = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "").replace(/^-/, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

function parseExtrato(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

  if (rows.length < 2) {
    throw new Error("Planilha vazia ou sem linhas de dados.");
  }

  const headerRowIndex = 0;
  const headers = rows[headerRowIndex].map(normalizeHeader);

  const colData = findColumn(headers, HEADER_ALIASES.data);
  const colDesc = findColumn(headers, HEADER_ALIASES.descricao);
  const colValor = findColumn(headers, HEADER_ALIASES.valor);
  const colCredito = findColumn(headers, HEADER_ALIASES.credito);
  const colDebito = findColumn(headers, HEADER_ALIASES.debito);
  const colSaldo = findColumn(headers, HEADER_ALIASES.saldo);

  if (colData === -1 || colDesc === -1) {
    throw new Error(
      "Não encontrei colunas de Data e Descrição no arquivo. Verifique o cabeçalho da planilha."
    );
  }

  const transacoes = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === "" || c == null)) continue;

    const data = parseBrDate(row[colData]);
    const descricao = String(row[colDesc] || "").trim();
    if (!data || !descricao) continue;

    let tipo, valor;
    if (colValor !== -1) {
      valor = parseNumber(row[colValor]);
      tipo = valor < 0 ? "debito" : "credito";
      valor = Math.abs(valor);
    } else {
      const credito = colCredito !== -1 ? parseNumber(row[colCredito]) : 0;
      const debito = colDebito !== -1 ? parseNumber(row[colDebito]) : 0;
      if (credito) {
        tipo = "credito";
        valor = Math.abs(credito);
      } else {
        tipo = "debito";
        valor = Math.abs(debito);
      }
    }

    const saldo = colSaldo !== -1 ? parseNumber(row[colSaldo]) : null;

    transacoes.push({ data, descricao, tipo, valor, saldo });
  }

  return transacoes;
}

module.exports = { parseExtrato };
