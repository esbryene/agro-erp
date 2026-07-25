import React, { useEffect, useState, useCallback, useRef } from "react";
import { FileUp, Landmark, Wallet, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Link2, ChevronRight } from "lucide-react";
import { COLORS, money, dateBr } from "../theme.js";
import { Fence, KpiCard, SectionCard, StatusBadge, Spinner, ErrorBanner } from "../components/ui.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const CLASSIFICACOES = [
  "Receita", "Devolução", "Fornecedor", "Energia", "Água", "Internet",
  "Telefone", "Tarifa bancária", "Transferência", "Não classificado",
];

export default function Conciliacao() {
  const { can } = useAuth();
  const [contas, setContas] = useState(null);
  const [contaId, setContaId] = useState(null);
  const [transacoes, setTransacoes] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const inputRef = useRef(null);

  const loadContas = useCallback(() => {
    api.get("/bank/accounts").then((data) => {
      setContas(data);
      if (data.length && !contaId) setContaId(data[0].id);
    }).catch((e) => setError(e.message));
  }, [contaId]);

  const loadTransacoes = useCallback(() => {
    if (!contaId) return;
    api.get(`/bank/accounts/${contaId}/transactions`).then(setTransacoes).catch((e) => setError(e.message));
  }, [contaId]);

  useEffect(() => { loadContas(); }, []); // eslint-disable-line
  useEffect(() => { loadTransacoes(); }, [loadTransacoes]);

  const banco = (contas || []).find((b) => b.id === contaId);

  const handleFile = async (file) => {
    if (!file || !contaId) return;
    setImporting(true);
    setError("");
    setInfo("");
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const result = await api.upload(`/bank/accounts/${contaId}/import`, fd);
      setInfo(`${result.importadas} lançamento(s) importado(s). ${result.sugestoes_conciliacao.length} sugestão(ões) de vínculo com contas a pagar.`);
      loadTransacoes();
      loadContas();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const setClassificacao = async (id, classificacao) => {
    setTransacoes((prev) => prev.map((t) => (t.id === id ? { ...t, classificacao } : t)));
    try { await api.patch(`/bank/transactions/${id}`, { classificacao }); } catch (e) { setError(e.message); }
  };

  const toggleConciliar = async (t) => {
    try {
      if (t.conciliado) {
        await api.post(`/bank/transactions/${t.id}/desfazer`, {});
      } else {
        await api.post(`/bank/transactions/${t.id}/conciliar`, { payable_id: t.payable_id || null });
      }
      loadTransacoes();
    } catch (e) { setError(e.message); }
  };

  if (!contas) return <Spinner />;

  const creditos = (transacoes || []).filter((r) => r.tipo === "credito").reduce((s, r) => s + Number(r.valor), 0);
  const debitos = (transacoes || []).filter((r) => r.tipo === "debito").reduce((s, r) => s + Number(r.valor), 0);
  const pendentes = (transacoes || []).filter((r) => !r.conciliado).length;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "Sora", color: COLORS.ink }}>Conciliação bancária</h1>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Importe o extrato em Excel e concilie com o contas a pagar.</p>
      <Fence />
      <ErrorBanner message={error} onClose={() => setError("")} />
      {info && <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "#E4EFDF", color: COLORS.forest }}>{info}</div>}

      <div className="flex gap-3 mb-5 flex-wrap">
        {contas.map((b) => {
          const active = b.id === contaId;
          return (
            <button key={b.id} onClick={() => setContaId(b.id)} className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition" style={{ borderColor: active ? COLORS.forest : COLORS.line, background: active ? "#EEF4EC" : "white", minWidth: 220 }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: active ? COLORS.forest : COLORS.cream }}>
                <Landmark size={16} style={{ color: active ? "white" : COLORS.muted }} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>{b.nome_banco}</div>
                <div className="text-xs" style={{ color: COLORS.muted }}>Ag {b.agencia || "—"} · CC {b.conta || "—"}</div>
              </div>
            </button>
          );
        })}
      </div>

      {banco && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label={`Saldo · ${banco.nome_banco}`} value={money(banco.saldo_atual)} icon={Wallet} accent={COLORS.forest} />
          <KpiCard label="Créditos" value={money(creditos)} icon={ArrowDownRight} accent={COLORS.forestSoft} />
          <KpiCard label="Débitos" value={money(debitos)} icon={ArrowUpRight} accent={COLORS.red} />
          <KpiCard label="Pendentes de conciliar" value={pendentes} icon={ArrowLeftRight} accent={COLORS.orange} />
        </div>
      )}

      {can("conciliacao", "can_edit") && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-8 mb-6 transition cursor-pointer"
          style={{ borderColor: dragOver ? COLORS.orange : COLORS.line, background: dragOver ? "#FCF3E4" : "white" }}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          <FileUp size={24} style={{ color: COLORS.orange }} />
          <p className="text-sm font-semibold mt-2" style={{ color: COLORS.ink }}>
            {importing ? "Importando..." : `Arraste o extrato em Excel de ${banco?.nome_banco || "..."} aqui`}
          </p>
          <p className="text-xs text-center max-w-md" style={{ color: COLORS.muted }}>
            Reconhece automaticamente data, descrição, crédito/débito e saldo — funciona com a maioria dos exports de internet banking.
          </p>
        </div>
      )}

      <SectionCard title={`Extrato importado — ${banco?.nome_banco || ""}`}>
        {!transacoes ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: COLORS.line }}>
                  {["Data", "Descrição", "Tipo", "Valor", "Classificação contábil", "Vínculo", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transacoes.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-sm" style={{ color: COLORS.muted }}>Nenhum lançamento importado ainda.</td></tr>
                )}
                {transacoes.map((r) => (
                  <tr key={r.id} className="border-b last:border-0" style={{ borderColor: COLORS.line }}>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: COLORS.ink }}>{dateBr(r.data)}</td>
                    <td className="px-3 py-2.5" style={{ color: COLORS.ink }}>{r.descricao}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1" style={{ background: r.tipo === "credito" ? "#E4EFDF" : COLORS.redSoft, color: r.tipo === "credito" ? COLORS.forest : COLORS.red }}>
                        {r.tipo === "credito" ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                        {r.tipo === "credito" ? "Crédito" : "Débito"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>
                      {r.tipo === "debito" ? "− " : "+ "}{money(r.valor)}
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={r.classificacao} disabled={!can("conciliacao", "can_edit")}
                        onChange={(e) => setClassificacao(r.id, e.target.value)}
                        className="text-xs font-semibold rounded-lg border px-2 py-1.5 outline-none bg-white"
                        style={{ borderColor: COLORS.line, color: COLORS.ink }}
                      >
                        {CLASSIFICACOES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: r.payable_fornecedor ? COLORS.ink : COLORS.muted }}>
                      {r.payable_fornecedor ? (
                        <span className="inline-flex items-center gap-1"><Link2 size={12} style={{ color: COLORS.forest }} /> {r.numero_boleto || "boleto"} · {r.payable_fornecedor}</span>
                      ) : "Sem correspondência"}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={r.conciliado ? "pago" : "pendente"} /></td>
                    <td className="px-3 py-2.5">
                      {can("conciliacao", "can_edit") && (
                        <button onClick={() => toggleConciliar(r)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border whitespace-nowrap"
                          style={{ borderColor: r.conciliado ? COLORS.line : COLORS.forest, color: r.conciliado ? COLORS.muted : "white", background: r.conciliado ? "white" : COLORS.forest }}>
                          {r.conciliado ? "Desfazer" : <>Conciliar <ChevronRight size={12} /></>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
