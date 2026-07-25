import React from "react";
import { COLORS } from "../theme.js";
import { LOGO_MARK } from "../logo.js";

export function Fence() {
  return (
    <div className="flex items-center gap-[3px] my-6 opacity-70" aria-hidden="true">
      <div className="h-[10px] w-[2px]" style={{ background: COLORS.gold }} />
      {Array.from({ length: 46 }).map((_, i) => (
        <div key={i} className="h-[6px] w-[2px]" style={{ background: COLORS.line }} />
      ))}
      <div className="h-[10px] w-[2px]" style={{ background: COLORS.gold }} />
    </div>
  );
}

export function LogoMark({ size = 34 }) {
  return (
    <img src={LOGO_MARK} alt="Agro Real Pet's" style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
  );
}

const STATUS_MAP = {
  paga: { label: "Paga", bg: "#E4EFDF", fg: COLORS.forest },
  pago: { label: "Pago", bg: "#E4EFDF", fg: COLORS.forest },
  conferida: { label: "Conferida", bg: COLORS.goldSoft, fg: "#8A6A0A" },
  pendente: { label: "Pendente", bg: "#EFEBDD", fg: COLORS.muted },
  hoje: { label: "Vence hoje", bg: COLORS.goldSoft, fg: "#8A6A0A" },
  a_vencer: { label: "A vencer", bg: "#E5EEFB", fg: "#2C5C96" },
  vencido: { label: "Vencida", bg: COLORS.redSoft, fg: COLORS.red },
  vencida: { label: "Vencida", bg: COLORS.redSoft, fg: COLORS.red },
  cancelado: { label: "Cancelado", bg: "#EFEBDD", fg: COLORS.muted },
  ativo: { label: "Ativo", bg: "#E4EFDF", fg: COLORS.forest },
  inativo: { label: "Inativo", bg: "#EFEBDD", fg: COLORS.muted },
};

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pendente;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

const CLASS_COLORS = {
  "Receita": { bg: "#E4EFDF", fg: COLORS.forest },
  "Devolução": { bg: "#EEE3F5", fg: "#6B3FA0" },
  "Fornecedor": { bg: COLORS.goldSoft, fg: "#8A6A0A" },
  "Energia": { bg: "#FCEBD9", fg: "#B15E14" },
  "Água": { bg: "#E1EEF6", fg: "#2C6E96" },
  "Internet": { bg: "#E1EEF6", fg: "#2C6E96" },
  "Telefone": { bg: "#E1EEF6", fg: "#2C6E96" },
  "Tarifa bancária": { bg: "#EFEBDD", fg: COLORS.muted },
  "Transferência": { bg: "#E5EEFB", fg: "#2C5C96" },
  "Não classificado": { bg: "#F1EDE2", fg: COLORS.muted },
};
export function ClassBadge({ label }) {
  const c = CLASS_COLORS[label] || CLASS_COLORS["Não classificado"];
  return <span className="px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: c.bg, color: c.fg }}>{label}</span>;
}

export function KpiCard({ label, value, delta, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl bg-white p-5 flex flex-col gap-3 border" style={{ borderColor: COLORS.line }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: COLORS.muted }}>{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + "22" }}>
            <Icon size={16} style={{ color: accent }} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>{value}</div>
      {delta && <div className="text-xs font-medium" style={{ color: COLORS.muted }}>{delta}</div>}
    </div>
  );
}

export function SectionCard({ title, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white border p-5 ${className}`} style={{ borderColor: COLORS.line }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Spinner({ label = "Carregando..." }) {
  return (
    <div className="flex items-center gap-2 text-sm py-8 justify-center" style={{ color: COLORS.muted }}>
      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: COLORS.forest, borderTopColor: "transparent" }} />
      {label}
    </div>
  );
}

export function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm mb-4 flex items-center justify-between" style={{ background: COLORS.redSoft, color: COLORS.red }}>
      <span>{message}</span>
      {onClose && <button onClick={onClose} className="font-bold ml-4">×</button>}
    </div>
  );
}
