import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { COLORS } from "../theme.js";
import { LogoMark, Fence, ErrorBanner } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.forestDeep }}>
      <div className="w-full max-w-4xl mx-4 rounded-3xl overflow-hidden grid md:grid-cols-2 shadow-2xl">
        <div className="hidden md:flex flex-col justify-between p-10" style={{ background: `linear-gradient(160deg, ${COLORS.forest}, ${COLORS.forestDeep})` }}>
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div style={{ fontFamily: "Sora" }}>
              <div className="text-white font-bold leading-tight text-lg">AGRO REAL</div>
              <div className="font-extrabold leading-tight text-lg" style={{ color: COLORS.gold }}>PET'S</div>
            </div>
          </div>
          <div>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.goldSoft }}>
              Controle financeiro do curral ao caixa. Fornecedores, notas, boletos, contas a receber
              e conciliação bancária organizados num único lugar.
            </p>
            <Fence />
            <p className="text-xs" style={{ color: "#C9D6C2" }}>Sistema profissional · dados reais</p>
          </div>
        </div>
        <div className="bg-white p-10 flex flex-col justify-center">
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Sora", color: COLORS.ink }}>Entrar no sistema</h1>
          <p className="text-sm mb-6" style={{ color: COLORS.muted }}>Use suas credenciais corporativas.</p>

          <ErrorBanner message={error} onClose={() => setError("")} />

          <form onSubmit={handleSubmit}>
            <label className="text-xs font-semibold mb-1 block" style={{ color: COLORS.ink }}>E-mail</label>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 mb-4" style={{ borderColor: COLORS.line }}>
              <Mail size={16} style={{ color: COLORS.muted }} />
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none text-sm" style={{ color: COLORS.ink }}
                placeholder="voce@agrorealpets.com.br"
              />
            </div>

            <label className="text-xs font-semibold mb-1 block" style={{ color: COLORS.ink }}>Senha</label>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 mb-2" style={{ borderColor: COLORS.line }}>
              <Lock size={16} style={{ color: COLORS.muted }} />
              <input
                type={showPw ? "text" : "password"} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none text-sm" style={{ color: COLORS.ink }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Mostrar senha">
                {showPw ? <EyeOff size={16} style={{ color: COLORS.muted }} /> : <Eye size={16} style={{ color: COLORS.muted }} />}
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 text-xs" style={{ color: COLORS.muted }}>
                <input type="checkbox" checked={manterConectado} onChange={(e) => setManterConectado(e.target.checked)} />
                Manter conectado
              </label>
              <button type="button" className="text-xs font-semibold" style={{ color: COLORS.orange }}>
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl py-3 font-bold text-sm text-white transition hover:brightness-110 disabled:opacity-60"
              style={{ background: COLORS.forest, fontFamily: "Sora" }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
