// Wrapper fino sobre fetch: injeta o token JWT, trata erros no formato
// { error: "mensagem" } devolvido pela API e faz upload de arquivos.
// Em produção (Netlify), defina VITE_API_URL com o endereço do backend no
// Render, ex: https://agro-erp-backend.onrender.com/api
const BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("agro_erp_token");
}

async function handle(res) {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) {
    const message = (isJson && body && body.error) || "Erro inesperado ao falar com o servidor.";
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, formData) => request(path, { method: "POST", body: formData, isForm: true }),
  fileUrl: (relPath) => `${BASE}/files/${relPath}`,
};

export { getToken };
