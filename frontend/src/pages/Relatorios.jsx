import React from "react";
import { BarChart3, Download } from "lucide-react";
import { COLORS } from "../theme.js";
import { Fence } from "../components/ui.jsx";
import { getToken } from "../api/client.js";

const REPORTS = [
  ["contas_por_fornecedor", "Contas por fornecedor"],
  ["despesas_por_mes", "Despesas por mês"],
  ["despesas_por_categoria", "Despesas por categoria"],
  ["fluxo_de_caixa", "Fluxo de caixa"],
  ["notas_fiscais", "Notas fiscais"],
  ["boletos", "Boletos"],
  ["pagamentos", "Pagamentos"],
  ["contas_vencidas", "Contas vencidas"],
  ["contas_a_vencer", "Contas a vencer"],
];

// Baixa o CSV autenticado (o link precisa do token, então montamos um blob).
async function baixarCsv(tipo) {
  const res = await fetch(`/api/reports/${tipo}?format=csv`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return alert("Não foi possível gerar o relatório.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tipo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "Sora", color: COLORS.ink }}>Relatórios</h1>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Exporte em CSV (compatível com Excel).</p>
      <Fence />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(([key, label]) => (
          <div key={key} className="rounded-2xl border bg-white p-5 flex flex-col gap-3" style={{ borderColor: COLORS.line }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: COLORS.goldSoft }}>
              <BarChart3 size={16} style={{ color: "#8A6A0A" }} />
            </div>
            <div className="font-semibold text-sm" style={{ color: COLORS.ink }}>{label}</div>
            <button onClick={() => baixarCsv(key)} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border w-fit" style={{ borderColor: COLORS.line, color: COLORS.ink }}>
              <Download size={12} /> Exportar CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
