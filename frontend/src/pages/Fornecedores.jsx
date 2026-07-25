import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, X } from "lucide-react";
import { COLORS, money, dateBr } from "../theme.js";
import { Fence, StatusBadge, Spinner, ErrorBanner } from "../components/ui.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const BLANK = {
  razao_social: "", nome_fantasia: "", cnpj: "", inscricao_estadual: "", inscricao_municipal: "",
  endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", cep: "",
  telefone: "", whatsapp: "", email: "", contato_nome: "", banco: "", agencia: "", conta: "", pix: "",
  observacoes: "",
};

function Field({ label, value, onChange, span = 1, ...rest }) {
  return (
    <label className={`text-xs font-semibold flex flex-col gap-1 ${span === 2 ? "col-span-2" : ""}`} style={{ color: COLORS.ink }}>
      {label}
      <input
        value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm font-normal outline-none"
        style={{ borderColor: COLORS.line }}
        {...rest}
      />
    </label>
  );
}

function SupplierForm({ onSaved, onCancel }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/suppliers", form);
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
          <h3 className="text-lg font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>Novo fornecedor</h3>
          <button type="button" onClick={onCancel}><X size={18} style={{ color: COLORS.muted }} /></button>
        </div>
        <ErrorBanner message={error} onClose={() => setError("")} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Razão social" span={2} required value={form.razao_social} onChange={set("razao_social")} />
          <Field label="Nome fantasia" value={form.nome_fantasia} onChange={set("nome_fantasia")} />
          <Field label="CNPJ" required value={form.cnpj} onChange={set("cnpj")} />
          <Field label="Inscrição estadual" value={form.inscricao_estadual} onChange={set("inscricao_estadual")} />
          <Field label="Inscrição municipal" value={form.inscricao_municipal} onChange={set("inscricao_municipal")} />
          <Field label="Endereço" span={2} value={form.endereco} onChange={set("endereco")} />
          <Field label="Número" value={form.numero} onChange={set("numero")} />
          <Field label="Complemento" value={form.complemento} onChange={set("complemento")} />
          <Field label="Bairro" value={form.bairro} onChange={set("bairro")} />
          <Field label="Cidade" value={form.cidade} onChange={set("cidade")} />
          <Field label="Estado" value={form.estado} onChange={set("estado")} />
          <Field label="CEP" value={form.cep} onChange={set("cep")} />
          <Field label="Telefone" value={form.telefone} onChange={set("telefone")} />
          <Field label="WhatsApp" value={form.whatsapp} onChange={set("whatsapp")} />
          <Field label="E-mail" span={2} value={form.email} onChange={set("email")} />
          <Field label="Nome do contato" span={2} value={form.contato_nome} onChange={set("contato_nome")} />
          <Field label="Banco" value={form.banco} onChange={set("banco")} />
          <Field label="Agência" value={form.agencia} onChange={set("agencia")} />
          <Field label="Conta" value={form.conta} onChange={set("conta")} />
          <Field label="PIX" value={form.pix} onChange={set("pix")} />
        </div>
        <button
          type="submit" disabled={saving}
          className="w-full rounded-xl py-3 mt-5 font-bold text-sm text-white disabled:opacity-60"
          style={{ background: COLORS.forest, fontFamily: "Sora" }}
        >
          {saving ? "Salvando..." : "Salvar fornecedor"}
        </button>
      </form>
    </div>
  );
}

export default function Fornecedores() {
  const { can } = useAuth();
  const [items, setItems] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get(`/suppliers${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setItems).catch((e) => setError(e.message));
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    try {
      const data = await api.get(`/suppliers/${id}`);
      setSelected(data);
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>Fornecedores</h1>
        {can("fornecedores", "can_edit") && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: COLORS.forest }}>
            <Plus size={16} /> Novo fornecedor
          </button>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Cadastro, histórico de compras e dados bancários.</p>
      <Fence />
      <ErrorBanner message={error} onClose={() => setError("")} />

      <div className="flex items-center gap-2 rounded-xl border px-3 py-2 mb-4 bg-white" style={{ borderColor: COLORS.line }}>
        <Search size={16} style={{ color: COLORS.muted }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar por razão social, nome fantasia ou CNPJ..." className="w-full outline-none text-sm" />
      </div>

      {!items ? <Spinner /> : (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: COLORS.line }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: COLORS.line, background: COLORS.cream }}>
                {["Fornecedor", "CNPJ", "Cidade/UF", "Contato", "Total (ano)", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: COLORS.muted }}>Nenhum fornecedor cadastrado ainda.</td></tr>
              )}
              {items.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-[#FAF7EF] cursor-pointer" style={{ borderColor: COLORS.line }} onClick={() => openDetail(f.id)}>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: COLORS.ink }}>{f.nome_fantasia || f.razao_social}</div>
                    <div className="text-xs" style={{ color: COLORS.muted }}>{f.razao_social}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{f.cnpj}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{f.cidade ? `${f.cidade}/${f.estado || ""}` : "—"}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{f.contato_nome || "—"}</td>
                  <td className="px-4 py-3 font-bold" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>{money(f.total_ano)}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
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
              <h3 className="text-lg font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>{selected.nome_fantasia || selected.razao_social}</h3>
              <button onClick={() => setSelected(null)}><X size={18} style={{ color: COLORS.muted }} /></button>
            </div>
            {[
              ["Razão social", selected.razao_social], ["CNPJ", selected.cnpj],
              ["Cidade", selected.cidade ? `${selected.cidade}/${selected.estado}` : "—"],
              ["Contato", selected.contato_nome || "—"], ["Telefone", selected.telefone || "—"],
              ["E-mail", selected.email || "—"], ["PIX", selected.pix || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-2 text-sm" style={{ borderColor: COLORS.line }}>
                <span style={{ color: COLORS.muted }}>{k}</span>
                <span className="font-semibold" style={{ color: COLORS.ink }}>{v}</span>
              </div>
            ))}
            <Fence />
            <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.muted }}>Histórico de notas</h4>
            {(selected.historico_notas || []).length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Sem notas lançadas.</p>}
            {(selected.historico_notas || []).map((n) => (
              <div key={n.id} className="flex justify-between py-2 border-b last:border-0 text-sm" style={{ borderColor: COLORS.line }}>
                <span style={{ color: COLORS.ink }}>{n.numero} · {dateBr(n.data_emissao)}</span>
                <span className="font-bold" style={{ fontFamily: "'JetBrains Mono'" }}>{money(n.valor_total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <SupplierForm onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}
