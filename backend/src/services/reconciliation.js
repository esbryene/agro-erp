// Sugere vínculos entre lançamentos do extrato bancário (débitos) e
// títulos em aberto no contas a pagar, por proximidade de valor e data.
const { pool } = require("../db");

const VALOR_TOLERANCIA = 0.01; // diferença máxima aceitável em R$
const DIAS_JANELA = 10; // procura vencimentos até N dias antes/depois da data do extrato

function diffDias(a, b) {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.abs(ms / (1000 * 60 * 60 * 24));
}

async function suggestMatches(bankAccountId) {
  const { rows: transacoes } = await pool.query(
    `SELECT * FROM bank_transactions
     WHERE bank_account_id = $1 AND tipo = 'debito' AND conciliado = FALSE AND payable_id IS NULL`,
    [bankAccountId]
  );
  if (transacoes.length === 0) return [];

  const { rows: payables } = await pool.query(
    `SELECT p.id, p.valor, p.data_vencimento, s.nome_fantasia, s.razao_social
     FROM payables p
     JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.status IN ('pendente', 'vencido')`
  );

  const sugestoes = [];
  for (const tx of transacoes) {
    let melhor = null;
    for (const p of payables) {
      const valorBate = Math.abs(Number(p.valor) - Number(tx.valor)) <= VALOR_TOLERANCIA;
      if (!valorBate) continue;
      const dias = diffDias(tx.data, p.data_vencimento);
      if (dias > DIAS_JANELA) continue;
      if (!melhor || dias < melhor.dias) {
        melhor = { payable: p, dias };
      }
    }
    if (melhor) {
      sugestoes.push({
        transacao_id: tx.id,
        payable_id: melhor.payable.id,
        fornecedor: melhor.payable.nome_fantasia || melhor.payable.razao_social,
        diferenca_dias: melhor.dias,
      });
    }
  }
  return sugestoes;
}

module.exports = { suggestMatches };
