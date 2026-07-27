require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { requireAuth } = require("./middleware/auth");
const { readFile } = require("./services/storage");

const app = express();
app.set("trust proxy", true); // necessário para req.ip correto atrás do nginx/VPS

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/suppliers", require("./routes/suppliers"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/payables", require("./routes/payables"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/receivables", require("./routes/receivables"));
app.use("/api/bank", require("./routes/bank"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/audit", require("./routes/audit"));

// Download protegido de anexos (XML, PDF, boletos, comprovantes).
// Exige login; não expõe a pasta de uploads/bucket publicamente.
app.get("/api/files/*", requireAuth, async (req, res) => {
  const relPath = req.params[0];
  if (relPath.includes("..")) return res.status(400).json({ error: "Caminho inválido." });
  try {
    const buffer = await readFile(relPath);
    res.send(buffer);
  } catch (err) {
    res.status(404).json({ error: "Arquivo não encontrado." });
  }
});

// Tratamento central de erros (inclui erros do multer, ex: arquivo grande demais)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Erro interno no servidor." });
});

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

const PORT = process.env.PORT || 4000;

// Migração e seed rodam aqui (mesmo processo/pool do servidor) em vez de
// processos separados: cada "node xxx.js" abriria uma conexão nova contra o
// pooler do Supabase, e reconexões rápidas em sequência travavam sem erro
// (pool.connect() não tem timeout padrão).
process.on("uncaughtException", (err) => console.error("[boot] uncaughtException:", err));
process.on("unhandledRejection", (err) => console.error("[boot] unhandledRejection:", err));
process.on("exit", (code) => console.log(`[boot] processo encerrando, code=${code}`));

console.log(`[boot] PORT=${PORT} subindo servidor sem migrate/seed (teste de diagnóstico)...`);
app.listen(PORT, () => {
  console.log(`[agro-erp] backend ouvindo na porta ${PORT}`);
});
