const { parseStringPromise } = require("xml2js");

// Aceita tanto o XML "puro" da NF-e (<NFe>) quanto o de distribuição
// (<nfeProc><NFe>...</NFe></nfeProc>), que é o mais comum quando baixado
// do portal da Receita ou do fornecedor.
function onlyText(val) {
  if (val == null) return null;
  if (Array.isArray(val)) return val[0];
  return val;
}
function num(val) {
  const t = onlyText(val);
  if (t == null || t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

async function parseNfeXml(xmlBuffer) {
  const parsed = await parseStringPromise(xmlBuffer.toString("utf8"), {
    explicitArray: true,
    tagNameProcessors: [(name) => name.replace(/^.*:/, "")], // remove prefixos de namespace
  });

  const root = parsed.nfeProc ? parsed.nfeProc.NFe[0] : parsed.NFe;
  if (!root || !root.infNFe) {
    throw new Error("XML não parece ser uma NF-e válida (tag infNFe não encontrada).");
  }
  const inf = root.infNFe[0];
  const chave = inf.$ && inf.$.Id ? inf.$.Id.replace(/^NFe/, "") : null;

  const ide = inf.ide[0];
  const emit = inf.emit[0];
  const enderEmit = emit.enderEmit ? emit.enderEmit[0] : {};
  const total = inf.total[0].ICMSTot[0];

  const dets = inf.det || [];
  const itens = dets.map((det) => {
    const prod = det.prod[0];
    return {
      codigo: onlyText(prod.cProd),
      descricao: onlyText(prod.xProd),
      ncm: onlyText(prod.NCM),
      cfop: onlyText(prod.CFOP),
      unidade: onlyText(prod.uCom),
      quantidade: num(prod.qCom),
      valor_unitario: num(prod.vUnCom),
      valor_total: num(prod.vProd),
      ean: onlyText(prod.cEAN) === "SEM GTIN" ? null : onlyText(prod.cEAN),
    };
  });

  return {
    chave_nfe: chave,
    numero: onlyText(ide.nNF),
    serie: onlyText(ide.serie),
    data_emissao: onlyText(ide.dhEmi) ? onlyText(ide.dhEmi).slice(0, 10) : null,
    emitente: {
      cnpj: onlyText(emit.CNPJ),
      razao_social: onlyText(emit.xNome),
      nome_fantasia: onlyText(emit.xFant),
      endereco: onlyText(enderEmit.xLgr),
      numero: onlyText(enderEmit.nro),
      bairro: onlyText(enderEmit.xBairro),
      cidade: onlyText(enderEmit.xMun),
      estado: onlyText(enderEmit.UF),
      cep: onlyText(enderEmit.CEP),
      telefone: onlyText(enderEmit.fone),
    },
    valores: {
      valor_produtos: num(total.vProd),
      frete: num(total.vFrete),
      seguro: num(total.vSeg),
      desconto: num(total.vDesc),
      outras_despesas: num(total.vOutro),
      impostos: num(total.vICMS) + num(total.vIPI) + num(total.vPIS) + num(total.vCOFINS),
      valor_total: num(total.vNF),
    },
    itens,
  };
}

module.exports = { parseNfeXml };
