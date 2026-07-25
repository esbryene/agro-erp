import React, { useEffect, useState, useCallback } from "react";
import { Plus, X, Check } from "lucide-react";
import { COLORS, dateBr } from "../theme.js";
import { Fence, SectionCard, StatusBadge, Spinner, ErrorBanner } from "../components/ui.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

function NovoUsuarioForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ name: "", email: "", cpf: "", telefone: "", cargo: "", departamento: "", role: "consulta", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/users", form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-20" onClick={onCancel}>
      <form onSubmit={submit} className="w-full max-w-md bg-white h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>Novo usuário</h3>
          <button type="button" onClick={onCancel}><X size={18} style={{ color: COLORS.muted }} /></button>
        </div>
        <ErrorBanner message={error} onClose={() => setError("")} />
        <div className="flex flex-col gap-3">
          <input required placeholder="Nome completo" value={form.name} onChange={set("name")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <input required type="email" placeholder="E-mail" value={form.email} onChange={set("email")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <input placeholder="CPF (opcional)" value={form.cpf} onChange={set("cpf")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <input placeholder="Telefone" value={form.telefone} onChange={set("telefone")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <input placeholder="Cargo" value={form.cargo} onChange={set("cargo")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <input placeholder="Departamento" value={form.departamento} onChange={set("departamento")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          <select value={form.role} onChange={set("role")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }}>
            <option value="administrador">Administrador</option>
            <option value="financeiro">Financeiro</option>
            <option value="compras">Compras</option>
            <option value="gerencia">Gerência</option>
            <option value="consulta">Consulta</option>
          </select>
          <input required type="password" minLength={8} placeholder="Senha (mín. 8 caracteres)" value={form.password} onChange={set("password")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-xl py-3 mt-5 font-bold text-sm text-white disabled:opacity-60" style={{ background: COLORS.forest, fontFamily: "Sora" }}>
          {saving ? "Salvando..." : "Criar usuário"}
        </button>
      </form>
    </div>
  );
}

export default function Usuarios() {
  const { can } = useAuth();
  const [users, setUsers] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [savingMatrix, setSavingMatrix] = useState(false);

  const loadUsers = useCallback(() => {
    api.get("/users").then(setUsers).catch((e) => setError(e.message));
  }, []);
  const loadMatrix = useCallback(() => {
    api.get("/users/permissions/matrix").then(setMatrix).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { loadUsers(); loadMatrix(); }, [loadUsers, loadMatrix]);

  const permFor = (role, moduleKey) =>
    matrix?.permissions.find((p) => p.role === role && p.module_key === moduleKey) || { can_view: false, can_edit: false, can_delete: false };

  const togglePerm = (role, moduleKey, level) => {
    setMatrix((prev) => {
      const permissions = prev.permissions.map((p) =>
        p.role === role && p.module_key === moduleKey ? { ...p, [level]: !p[level] } : p
      );
      const exists = prev.permissions.some((p) => p.role === role && p.module_key === moduleKey);
      if (!exists) permissions.push({ role, module_key: moduleKey, can_view: false, can_edit: false, can_delete: false, [level]: true });
      return { ...prev, permissions };
    });
  };

  const salvarMatriz = async () => {
    setSavingMatrix(true);
    try {
      await api.put("/users/permissions/matrix", { entries: matrix.permissions });
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingMatrix(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>Usuários & permissões</h1>
        {can("usuarios", "can_edit") && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: COLORS.forest }}>
            <Plus size={16} /> Novo usuário
          </button>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Perfis de acesso e controle por módulo.</p>
      <Fence />
      <ErrorBanner message={error} onClose={() => setError("")} />

      <SectionCard title="Usuários cadastrados" className="mb-5">
        {!users ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: COLORS.line }}>
                {["Nome", "E-mail", "Cargo", "Perfil", "Status", "Último acesso"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: COLORS.line }}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: COLORS.ink }}>{u.name}</td>
                  <td className="px-3 py-2.5" style={{ color: COLORS.muted }}>{u.email}</td>
                  <td className="px-3 py-2.5" style={{ color: COLORS.ink }}>{u.cargo || "—"}</td>
                  <td className="px-3 py-2.5 capitalize" style={{ color: COLORS.ink }}>{u.role}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={u.status} /></td>
                  <td className="px-3 py-2.5" style={{ color: COLORS.muted }}>{u.last_login_at ? dateBr(u.last_login_at) : "nunca"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard
        title="Matriz de permissões por perfil"
        action={can("usuarios", "can_edit") && matrix && (
          <button onClick={salvarMatriz} disabled={savingMatrix} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60" style={{ background: COLORS.forest }}>
            {savingMatrix ? "Salvando..." : "Salvar alterações"}
          </button>
        )}
      >
        {!matrix ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: COLORS.line }}>
                  <th className="px-3 py-2 text-xs font-semibold uppercase" style={{ color: COLORS.muted }}>Módulo</th>
                  {matrix.roles.map((r) => (
                    <th key={r.key} className="px-3 py-2 text-xs font-semibold text-center" style={{ color: COLORS.ink }}>{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.modules.map((m) => (
                  <tr key={m.key} className="border-b last:border-0" style={{ borderColor: COLORS.line }}>
                    <td className="px-3 py-2.5 font-medium" style={{ color: COLORS.ink }}>{m.label}</td>
                    {matrix.roles.map((r) => {
                      const p = permFor(r.key, m.key);
                      const disabled = r.key === "administrador" || !can("usuarios", "can_edit");
                      return (
                        <td key={r.key} className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {["can_view", "can_edit", "can_delete"].map((level) => (
                              <button
                                key={level} type="button" disabled={disabled}
                                title={level.replace("can_", "")}
                                onClick={() => togglePerm(r.key, m.key, level)}
                                className="w-5 h-5 rounded flex items-center justify-center border disabled:opacity-40"
                                style={{
                                  borderColor: p[level] ? COLORS.forest : COLORS.line,
                                  background: p[level] ? COLORS.forest : "white",
                                }}
                              >
                                {p[level] && <Check size={12} color="white" />}
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs mt-3" style={{ color: COLORS.muted }}>Em cada célula: ver · editar · excluir. O perfil Administrador sempre tem acesso total.</p>
          </div>
        )}
      </SectionCard>

      {showForm && <NovoUsuarioForm onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadUsers(); }} />}
    </div>
  );
}
