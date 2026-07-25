import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Truck, FileText, Receipt, Wallet, Landmark, BarChart3,
  Users, Search, Bell, ChevronDown, LogOut,
} from "lucide-react";
import { COLORS } from "../theme.js";
import { LogoMark, Fence } from "./ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, module: "dashboard", end: true },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck, module: "fornecedores" },
  { to: "/notas", label: "Notas fiscais", icon: FileText, module: "notas" },
  { to: "/contas-pagar", label: "Contas a pagar", icon: Receipt, module: "contas_pagar" },
  { to: "/contas-receber", label: "Contas a receber", icon: Wallet, module: "contas_receber" },
  { to: "/conciliacao", label: "Conciliação bancária", icon: Landmark, module: "conciliacao" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, module: "relatorios" },
  { to: "/usuarios", label: "Usuários & permissões", icon: Users, module: "usuarios" },
];

export default function Shell({ children }) {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = (user?.name || "?").split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen w-full flex" style={{ background: COLORS.cream }}>
      <aside className="w-64 shrink-0 flex flex-col justify-between p-5" style={{ background: COLORS.forestDeep }}>
        <div>
          <div className="flex items-center gap-3 mb-8 px-1">
            <LogoMark size={36} />
            <div style={{ fontFamily: "Sora" }}>
              <div className="text-white font-bold leading-tight text-sm">AGRO REAL</div>
              <div className="font-extrabold leading-tight text-sm" style={{ color: COLORS.gold }}>PET'S · ERP</div>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.filter((n) => can(n.module, "can_view")).map((n) => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left " +
                    (isActive ? "text-white" : "")
                  }
                  style={({ isActive }) => ({
                    background: isActive ? COLORS.forest : "transparent",
                    color: isActive ? "white" : "#C9D6C2",
                  })}
                >
                  <Icon size={17} />
                  {n.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div>
          <Fence />
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm w-full rounded-xl" style={{ color: "#C9D6C2" }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b bg-white" style={{ borderColor: COLORS.line }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 w-96 max-w-[40vw]" style={{ background: COLORS.cream }}>
            <Search size={16} style={{ color: COLORS.muted }} />
            <input placeholder="Buscar..." className="bg-transparent outline-none text-sm w-full" />
          </div>
          <div className="flex items-center gap-4">
            <Bell size={19} style={{ color: COLORS.ink }} />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: COLORS.forest, fontFamily: "Sora" }}>
                {initials}
              </div>
              <div className="text-sm leading-tight hidden sm:block">
                <div className="font-semibold" style={{ color: COLORS.ink }}>{user?.name}</div>
                <div style={{ color: COLORS.muted, fontSize: 11 }}>{user?.cargo || user?.role}</div>
              </div>
              <ChevronDown size={14} style={{ color: COLORS.muted }} />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
