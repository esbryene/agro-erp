import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]); // [{module_key, can_view, can_edit, can_delete}]
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("agro_erp_token");
    if (!token) { setLoading(false); return; }
    try {
      const data = await api.get("/auth/me");
      setUser(data.user);
      setPermissions(data.permissions);
    } catch {
      localStorage.removeItem("agro_erp_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const login = async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    localStorage.setItem("agro_erp_token", data.token);
    setUser(data.user);
    await loadMe();
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    localStorage.removeItem("agro_erp_token");
    setUser(null);
    setPermissions([]);
  };

  // true se o perfil do usuário logado pode "view" | "edit" | "delete" no módulo
  const can = (moduleKey, level = "can_view") => {
    if (user?.role === "administrador") return true;
    const perm = permissions.find((p) => p.module_key === moduleKey);
    return !!perm?.[level];
  };

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
