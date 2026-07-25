import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Shell from "./components/Shell.jsx";
import { Spinner } from "./components/ui.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Fornecedores from "./pages/Fornecedores.jsx";
import Notas from "./pages/Notas.jsx";
import ContasPagar from "./pages/ContasPagar.jsx";
import ContasReceber from "./pages/ContasReceber.jsx";
import Conciliacao from "./pages/Conciliacao.jsx";
import Relatorios from "./pages/Relatorios.jsx";
import Usuarios from "./pages/Usuarios.jsx";

function RequireAuth({ children, module }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner label="Carregando sessão..." /></div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (module && !can(module, "can_view")) {
    return (
      <Shell>
        <div className="rounded-2xl border bg-white p-8 text-center">
          <p className="text-sm" style={{ color: "#767C6E" }}>Seu perfil não tem acesso a esta área. Fale com o administrador do sistema.</p>
        </div>
      </Shell>
    );
  }
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth module="dashboard"><Dashboard /></RequireAuth>} />
      <Route path="/fornecedores" element={<RequireAuth module="fornecedores"><Fornecedores /></RequireAuth>} />
      <Route path="/notas" element={<RequireAuth module="notas"><Notas /></RequireAuth>} />
      <Route path="/contas-pagar" element={<RequireAuth module="contas_pagar"><ContasPagar /></RequireAuth>} />
      <Route path="/contas-receber" element={<RequireAuth module="contas_receber"><ContasReceber /></RequireAuth>} />
      <Route path="/conciliacao" element={<RequireAuth module="conciliacao"><Conciliacao /></RequireAuth>} />
      <Route path="/relatorios" element={<RequireAuth module="relatorios"><Relatorios /></RequireAuth>} />
      <Route path="/usuarios" element={<RequireAuth module="usuarios"><Usuarios /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
