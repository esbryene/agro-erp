import React, { useEffect, useState, useCallback } from "react";
import { Plus, X, Trash2, CheckCircle2 } from "lucide-react";
import { COLORS, money, dateBr } from "../theme.js";
import { Fence, StatusBadge, Spinner, ErrorBanner, KpiCard } from "../components/ui.jsx";
import { Wallet, AlertTriangle, Users as UsersIcon, Clock } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const TABS = [["", "Todas"], ["hoje", "Vence hoje"], ["a_vencer", "A vencer"], ["vencida", "Vencidas"], ["paga", "Recebidas"]];

function NovaVendaForm({ onSaved, onCancel }) {
  const [cliente, setCliente] = useState({ nome: "", cpf: "", endereco: "", telefone: "", email: "" });
  const [prazoDias, setPrazoDias] = useState(30);
  const [itens, setItens] = useState([{ descricao: "", quantidade: 1, valor_unitario: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setItem = (idx, field, value) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItens((prev) => [...prev, { descricao: "", quantidade: 1, valor_unitario: 0 }]);
  const removeItem = (idx) => setItens((prev) => prev.filter((_, i) => i !== idx));
  const total = itens.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/receivables", { cliente, prazo_dias: Number(prazoDias), itens });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-20" onClick={onCancel}>
      <form onSubmit={submit} className="w-full max-w-lg bg-white h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>Nova venda a prazo</h3>
          <button type="button" onClick={onCancel}><X size={18} style={{ color: COLORS.muted }} /></button>
        </div>
        <ErrorBanner message={error} onClose={() => setError("")} />

        <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.muted }}>Cliente</h4>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <input required placeholder="Nome completo" value={cliente.nome} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} className="col-span-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <input placeholder="CPF" value={cliente.cpf} onChange={(e) => setCliente({ ...cliente, cpf: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <input placeholder="Telefone" value={cliente.telefone} onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <input placeholder="Endereço completo" value={cliente.endereco} onChange={(e) => setCliente({ ...cliente, endereco: e.target.value })} className="col-span-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
        </div>

        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>Itens comprados</h4>
          <label className="text-xs flex items-center gap-2" style={{ color: COLORS.muted }}>
            Vencimento em <input type="number" min={1} value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} className="w-14 rounded border px-2 py-1 text-center" style={{ borderColor: COLORS.line }} /> dias
          </label>
        </div>

        {itens.map((it, idx) => (
          <div key={idx} className="flex gap-2 mb-2 items-center">
            <input required placeholder="Descrição do item" value={it.descricao} onChange={(e) => setItem(idx, "descricao", e.target.value)} className="flex-1 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
            <input type="number" min={0.01} step="0.01" placeholder="Qtd" value={it.quantidade} onChange={(e) => setItem(idx, "quantidade", e.target.value)} className="w-16 rounded-lg border px-2 py-2 text-sm" style={{ borderColor: COLORS.line }} />
            <input type="number" min={0} step="0.01" placeholder="Valor un." value={it.valor_unitario} onChange={(e) => setItem(idx, "valor_unitario", e.target.value)} className="w-24 rounded-lg border px-2 py-2 text-sm" style={{ borderColor: COLORS.line }} />
            {itens.length > 1 && (
              <button type="button" onClick={() => removeItem(idx)}><Trash2 size={15} style={{ color: COLORS.red }} /></button>
            )}
          </div>
        ))}
        <button type="button" onClick={addItem} className="text-xs font-semibold mb-4" style={{ color: COLORS.forest }}>+ adicionar item</button>

        <div className="flex justify-between text-sm font-bold border-t pt-3 mb-4" style={{ borderColor: COLORS.line, color: COLORS.ink }}>
          <span>Total</span><span style={{ fontFamily: "'JetBrains Mono'" }}>{money(total)}</span>
        </div>

        <button type="submit" disabled={saving} className="w-full rounded-xl py-3 font-bold text-sm text-white disabled:opacity-60" style={{ background: COLORS.forest, fontFamily: "Sora" }}>
          {saving ? "Salvando..." : "Registrar venda"}
        </button>
      </form>
    </div>
  );
}

export default function ContasReceber() {
  const { can } = useAuth();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get(`/receivables${filter ? `?status=${filter}` : ""}`).then(setItems).catch((e) => setError(e.message));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    try { setSelected(await api.get(`/receivables/${id}`)); } catch (e) { setError(e.message); }
  };

  const marcarRecebido = async (id) => {
    setBusyId(id);
    try { await api.post(`/receivables/${id}/receber`, {}); load(); } catch (e) { setError(e.message); } finally { setBusyId(null); }
  };

  const totalAberto = (items || []).filter((c) => c.status !== "paga").reduce((s, c) => s + Number(c.valor_total), 0);
  const totalVencido = (items || []).filter((c) => c.status === "vencida").reduce((s, c) => s + Number(c.valor_total), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>Contas a receber</h1>
        {can("contas_receber", "can_edit") && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: COLORS.forest }}>
            <Plus size={16} /> Nova venda / cliente
          </button>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Cliente, CPF, endereço, telefone e itens comprados. Vencimento padrão de 30 dias.</p>
      <Fence />
      <ErrorBanner message={error} onClose={() => setError("")} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="A receber em aberto" value={money(totalAberto)} icon={Wallet} accent={COLORS.forest} />
        <KpiCard label="Vencido" value={money(totalVencido)} icon={AlertTriangle} accent={COLORS.red} />
        <KpiCard label="Vendas ativas" value={items ? items.length : "—"} icon={UsersIcon} accent={COLORS.orange} />
        <KpiCard label="Vencimento padrão" value="30 dias" icon={Clock} accent={COLORS.forestSoft} />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className="px-3.5 py-1.5 rounded-full text-xs font-semibold border"
            style={{ background: filter === k ? COLORS.forest : "white", color: filter === k ? "white" : COLORS.ink, borderColor: filter === k ? COLORS.forest : COLORS.line }}>
            {label}
          </button>
        ))}
      </div>

      {!items ? <Spinner /> : (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: COLORS.line }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: COLORS.line, background: COLORS.cream }}>
                {["Cliente", "CPF", "Telefone", "Venda", "Vencimento", "Valor", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: COLORS.muted }}>Nenhuma venda a prazo registrada.</td></tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-[#FAF7EF] cursor-pointer" style={{ borderColor: COLORS.line }} onClick={() => openDetail(c.id)}>
                  <td className="px-4 py-3 font-semibold" style={{ color: COLORS.ink }}>{c.cliente_nome}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{c.cpf || "—"}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{c.telefone || "—"}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{dateBr(c.data_venda)}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{dateBr(c.data_vencimento)}</td>
                  <td className="px-4 py-3 font-bold" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>{money(c.valor_total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {c.status !== "paga" && can("contas_receber", "can_edit") && (
                      <button onClick={() => marcarRecebido(c.id)} disabled={busyId === c.id}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border whitespace-nowrap disabled:opacity-50"
                        style={{ borderColor: COLORS.forest, color: COLORS.forest }}>
                        <CheckCircle2 size={13} /> {busyId === c.id ? "..." : "Recebido"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-20" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>{selected.cliente_nome}</h3>
              <button onClick={() => setSelected(null)}><X size={18} style={{ color: COLORS.muted }} /></button>
            </div>
            {[["CPF", selected.cpf], ["Telefone", selected.telefone], ["Endereço", selected.endereco],
              ["Data da venda", dateBr(selected.data_venda)], ["Vencimento", dateBr(selected.data_vencimento)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b py-2 text-sm" style={{ borderColor: COLORS.line }}>
                <span style={{ color: COLORS.muted }}>{k}</span>
                <span className="font-semibold text-right" style={{ color: COLORS.ink }}>{v || "—"}</span>
              </div>
            ))}
            <Fence />
            <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.muted }}>Itens comprados</h4>
            {(selected.itens || []).map((i, idx) => (
              <div key={idx} className="flex justify-between items-start py-2 border-b last:border-0 text-sm gap-3" style={{ borderColor: COLORS.line }}>
                <div>
                  <div style={{ color: COLORS.ink }}>{i.descricao}</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>{i.quantidade} × {money(i.valor_unitario)}</div>
                </div>
                <span className="font-bold whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>{money(i.quantidade * i.valor_unitario)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 mt-1 border-t font-bold text-sm" style={{ borderColor: COLORS.line, color: COLORS.ink }}>
              <span>Total</span><span style={{ fontFamily: "'JetBrains Mono'" }}>{money(selected.valor_total)}</span>
            </div>
          </div>
        </div>
      )}

      {showForm && <NovaVendaForm onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}
