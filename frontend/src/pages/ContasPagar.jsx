import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import { COLORS, money, dateBr } from "../theme.js";
import { Fence, StatusBadge, Spinner, ErrorBanner } from "../components/ui.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const TABS = [
  ["", "Todas"], ["pendente", "Pendentes"], ["vencido", "Vencidas"], ["pago", "Pagas"], ["cancelado", "Canceladas"],
];

export default function ContasPagar() {
  const { can } = useAuth();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get(`/payables${filter ? `?status=${filter}` : ""}`).then(setItems).catch((e) => setError(e.message));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const marcarPago = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/payables/${id}/pagar`, {});
      load();
    } catch (e) { setError(e.message); } finally { setBusyId(null); }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "Sora", color: COLORS.ink }}>Contas a pagar</h1>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Boletos avulsos e recorrências geradas a partir das notas.</p>
      <Fence />
      <ErrorBanner message={error} onClose={() => setError("")} />

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(([k, label]) => (
          <button
            key={k} onClick={() => setFilter(k)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold border"
            style={{
              background: filter === k ? COLORS.forest : "white",
              color: filter === k ? "white" : COLORS.ink,
              borderColor: filter === k ? COLORS.forest : COLORS.line,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {!items ? <Spinner /> : (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: COLORS.line }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: COLORS.line, background: COLORS.cream }}>
                {["Fornecedor", "Documento", "Vencimento", "Valor", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: COLORS.muted }}>Nenhum título encontrado.</td></tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="border-b last:border-0" style={{ borderColor: COLORS.line }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: COLORS.ink }}>{c.nome_fantasia || c.razao_social}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{c.documento || c.numero_boleto || "—"}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{dateBr(c.data_vencimento)}</td>
                  <td className="px-4 py-3 font-bold" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>{money(c.valor)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    {c.status !== "pago" && c.status !== "cancelado" && can("contas_pagar", "can_edit") && (
                      <button
                        onClick={() => marcarPago(c.id)} disabled={busyId === c.id}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border whitespace-nowrap disabled:opacity-50"
                        style={{ borderColor: COLORS.forest, color: COLORS.forest }}
                      >
                        <CheckCircle2 size={13} /> {busyId === c.id ? "..." : "Marcar pago"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
