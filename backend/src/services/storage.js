// Guarda os anexos (XML de notas, boletos, comprovantes) no Supabase Storage
// quando SUPABASE_URL/SUPABASE_SERVICE_KEY estão configurados (ambiente free
// tier, sem disco persistente). Se essas variáveis não existirem, usa disco
// local normalmente (ex: rodando com Docker num VPS).
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "anexos";
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

let supabase = null;
if (useSupabase) {
  const { createClient } = require("@supabase/supabase-js");
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

const localUploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");

/**
 * Salva um arquivo (buffer em memória, vindo do multer.memoryStorage()).
 * `relPath` é o caminho relativo desejado, ex: "xml/123-nota.xml".
 * Retorna o mesmo relPath, que é o que fica salvo no banco.
 */
async function saveFile(relPath, buffer) {
  if (useSupabase) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(relPath, buffer, { upsert: true });
    if (error) throw new Error(`Falha ao salvar anexo no Supabase: ${error.message}`);
    return relPath;
  }
  const fullPath = path.join(localUploadsDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return relPath;
}

/** Lê um arquivo salvo anteriormente (retorna um Buffer). */
async function readFile(relPath) {
  if (useSupabase) {
    const { data, error } = await supabase.storage.from(BUCKET).download(relPath);
    if (error) throw new Error(`Anexo não encontrado: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  const fullPath = path.join(localUploadsDir, relPath);
  if (!fs.existsSync(fullPath)) throw new Error("Anexo não encontrado.");
  return fs.readFileSync(fullPath);
}

module.exports = { saveFile, readFile, useSupabase };
