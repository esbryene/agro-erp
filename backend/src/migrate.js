// Executa todos os arquivos .sql em src/migrations, em ordem, dentro de uma
// tabela de controle "schema_migrations" para não rodar duas vezes.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("./db");

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const dir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();

    for (const file of files) {
      const { rows } = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file]
      );
      if (rows.length > 0) {
        console.log(`[migrate] ${file} já aplicada, pulando.`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      console.log(`[migrate] aplicando ${file}...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[migrate] ${file} aplicada com sucesso.`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("[migrate] falhou:", err);
  process.exit(1);
});
