import React, { useEffect, useState, useCallback, useRef } from "react";
import { FileUp, Paperclip } from "lucide-react";
import { COLORS, money, dateBr } from "../theme.js";
import { Fence, StatusBadge, Spinner, ErrorBanner } from "../components/ui.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Notas() {
  const { can } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(() => {
    api.get("/invoices").then(setItems).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      setError("Envie um arquivo .xml de NF-e.");
      return;
    }
    setImporting(true);
    setError("");
    setInfo("");
    try {
      const fd = new FormData();
      fd.append("xml", file);
      const result = await api.upload("/invoices/import-xml", fd);
      setInfo(
        `Nota ${result.numero} importada com sucesso${result.fornecedor_criado ? " — fornecedor cadastrado automaticamente pelo CNPJ" : ""}.`
      );
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Sora", color: COLORS.ink }}>Notas fiscais</h1>
      </div>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>Importe o XML da NF-e — fornecedor e itens são preenchidos automaticamente.</p>
      <Fence />
      <ErrorBanner message={error} onClose={() => setError("")} />
      {info && <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "#E4EFDF", color: COLORS.forest }}>{info}</div>}

      {can("notas", "can_edit") && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-10 mb-6 transition cursor-pointer"
          style={{ borderColor: dragOver ? COLORS.orange : COLORS.line, background: dragOver ? "#FCF3E4" : "white" }}
        >
          <input ref={inputRef} type="file" accept=".xml" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          <FileUp size={26} style={{ color: COLORS.orange }} />
          <p className="text-sm font-semibold mt-2" style={{ color: COLORS.ink }}>
            {importing ? "Importando..." : "Arraste o XML da NF-e aqui ou clique para selecionar"}
          </p>
          <p className="text-xs" style={{ color: COLORS.muted }}>Preenchimento automático de itens, impostos e emitente</p>
        </div>
      )}

      {!items ? <Spinner /> : (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: COLORS.line }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: COLORS.line, background: COLORS.cream }}>
                {["Nota", "Fornecedor", "Emissão", "Valor", "Status", "XML"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: COLORS.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: COLORS.muted }}>Nenhuma nota lançada ainda.</td></tr>
              )}
              {items.map((n) => (
                <tr key={n.id} className="border-b last:border-0" style={{ borderColor: COLORS.line }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: COLORS.ink }}>{n.numero}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{n.nome_fantasia || n.razao_social}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{dateBr(n.data_emissao)}</td>
                  <td className="px-4 py-3 font-bold" style={{ fontFamily: "'JetBrains Mono'", color: COLORS.ink }}>{money(n.valor_total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                  <td className="px-4 py-3">
                    {n.xml_path ? (
                      <a href={api.fileUrl(n.xml_path)} target="_blank" rel="noreferrer">
                        <Paperclip size={15} style={{ color: COLORS.forest }} />
                      </a>
                    ) : <span style={{ color: COLORS.muted }}>—</span>}
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
