import React, { useEffect, useState } from "react";
import { Receipt, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLORS, money, dateBr } from "../theme.js";
import { Fence, KpiCard, SectionCard, StatusBadge, Spinner, ErrorBanner } from "../components/ui.jsx";
import { api } from "../api/client.js";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/summary").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>Visão geral</h1>
      </div>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Panorama financeiro da Agro Real & Pet's.</p>
      <Fence />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="A pagar em aberto" value={money(data.a_pagar_em_aberto.total)} icon={Receipt} accent={COLORS.forest} delta={`${data.a_pagar_em_aberto.qtd} título(s) pendente(s)`} />
        <KpiCard label="Pago no mês" value={money(data.pago_no_mes)} icon={CheckCircle2} accent={COLORS.forestSoft} />
        <KpiCard label="Vencido" value={money(data.vencido.total)} icon={AlertTriangle} accent={COLORS.red} delta={`${data.vencido.qtd} boleto(s)`} />
        <KpiCard label="Vence hoje" value={money(data.vence_hoje.total)} icon={Clock} accent={COLORS.orange} delta={`${data.vence_hoje.qtd} boleto(s)`} />
      </div>

      <SectionCard title="Despesas por categoria (últimos 6 meses)" className="mb-6">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.despesas_por_categoria} margin={{ left: -20 }}>
            <CartesianGrid stroke={COLORS.line} vertical={false} />
            <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${COLORS.line}` }} />
            <Bar dataKey="total" fill={COLORS.forest} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="Vence nos próximos 7 dias">
          {data.vence_proximos_7_dias.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Nada vencendo nos próximos 7 dias.</p>}
          {data.vence_proximos_7_dias.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: COLORS.line }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.ink }}>{c.nome_fantasia}</div>
                <div className="text-xs" style={{ color: COLORS.muted }}>vence {dateBr(c.data_vencimento)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>{money(c.valor)}</div>
                <StatusBadge status={c.status} />
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Últimos lançamentos">
          {data.ultimos_lancamentos.length === 0 && <p className="text-sm" style={{ color: COLORS.muted }}>Nenhuma nota lançada ainda.</p>}
          {data.ultimos_lancamentos.map((n) => (
            <div key={n.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: COLORS.line }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.ink }}>{n.numero} · {n.nome_fantasia}</div>
                <div className="text-xs" style={{ color: COLORS.muted }}>Emitida em {dateBr(n.data_emissao)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>{money(n.valor_total)}</div>
                <StatusBadge status={n.status} />
              </div>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}
