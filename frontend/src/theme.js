// Paleta e helpers compartilhados por toda a aplicação (mesma identidade
// visual validada no protótipo).
export const COLORS = {
  forest: "#2E5E32",
  forestDeep: "#17301A",
  forestSoft: "#3E7444",
  gold: "#F0B429",
  goldSoft: "#FBE6A8",
  orange: "#DD8A2E",
  cream: "#FAF7EF",
  ink: "#23281F",
  muted: "#767C6E",
  line: "#E7E2D4",
  red: "#B7473C",
  redSoft: "#F6E1DE",
};

export const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const dateBr = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
