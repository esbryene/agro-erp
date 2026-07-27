// O seed roda a cada boot do backend no Render (free tier não tem Shell).
// Este teste garante que o segundo boot em diante não reescreve a matriz de
// permissões nem recria o admin — ou seja, não desfaz nada que foi ajustado
// nas telas do sistema.
//
// Roda sem banco: troca o módulo db por um dublê que responde as contagens.
//   node test-seed-idempotente.js vazio   (primeiro boot)
//   node test-seed-idempotente.js cheio   (boots seguintes)
const assert = require("assert");

const cheio = process.argv[2] === "cheio";
const executadas = [];

const client = {
  async query(sql) {
    executadas.push(sql);
    if (/COUNT\(\*\)::int AS n FROM role_permissions/.test(sql)) return { rows: [{ n: cheio ? 45 : 0 }] };
    if (/FROM users WHERE email/.test(sql)) return { rows: cheio ? [{ id: 1 }] : [] };
    if (/COUNT\(\*\)::int AS n FROM bank_accounts/.test(sql)) return { rows: [{ n: cheio ? 2 : 0 }] };
    if (/COUNT\(\*\)::int AS n FROM cost_centers/.test(sql)) return { rows: [{ n: cheio ? 4 : 0 }] };
    return { rows: [] };
  },
  release() {},
};

const dbPath = require.resolve("./src/db.js");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { pool: { connect: async () => client, end: async () => {} } },
};

require("./src/seed.js")
  .seed()
  .then(() => {
    const tocouPermissoes = executadas.some((s) => /INSERT INTO role_permissions/.test(s));
    const criouAdmin = executadas.some((s) => /INSERT INTO users/.test(s));
    const criouBancos = executadas.some((s) => /INSERT INTO bank_accounts/.test(s));

    if (cheio) {
      assert.strictEqual(tocouPermissoes, false, "reescreveu permissões já existentes — apagaria as personalizações");
      assert.strictEqual(criouAdmin, false, "tentou recriar o admin");
      assert.strictEqual(criouBancos, false, "duplicou os bancos");
      console.log("OK: boots seguintes não desfazem nada.");
    } else {
      assert.strictEqual(tocouPermissoes, true, "primeiro boot não criou as permissões");
      assert.strictEqual(criouAdmin, true, "primeiro boot não criou o admin");
      console.log("OK: primeiro boot cria admin, permissões e bancos.");
    }
  });
