// Popula dados iniciais: usuário administrador, matriz de permissões por
// perfil e os dois bancos usados na conciliação bancária.
// Rode com: node src/seed.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("./db");

const MODULES = [
  "dashboard", "fornecedores", "notas", "contas_pagar",
  "contas_receber", "conciliacao", "relatorios", "usuarios", "auditoria",
];

// view / edit / delete por perfil e módulo.
const PERMISSIONS = {
  administrador: Object.fromEntries(MODULES.map(m => [m, [true, true, true]])),
  financeiro: {
    dashboard: [true, false, false],
    fornecedores: [true, false, false],
    notas: [true, true, false],
    contas_pagar: [true, true, false],
    contas_receber: [true, true, false],
    conciliacao: [true, true, false],
    relatorios: [true, false, false],
    usuarios: [false, false, false],
    auditoria: [false, false, false],
  },
  compras: {
    dashboard: [true, false, false],
    fornecedores: [true, true, false],
    notas: [true, true, false],
    contas_pagar: [true, false, false],
    contas_receber: [false, false, false],
    conciliacao: [false, false, false],
    relatorios: [false, false, false],
    usuarios: [false, false, false],
    auditoria: [false, false, false],
  },
  gerencia: {
    dashboard: [true, false, false],
    fornecedores: [true, false, false],
    notas: [true, false, false],
    contas_pagar: [true, true, false],
    contas_receber: [true, true, false],
    conciliacao: [true, false, false],
    relatorios: [true, false, false],
    usuarios: [false, false, false],
    auditoria: [true, false, false],
  },
  consulta: {
    dashboard: [true, false, false],
    fornecedores: [true, false, false],
    notas: [true, false, false],
    contas_pagar: [true, false, false],
    contas_receber: [true, false, false],
    conciliacao: [false, false, false],
    relatorios: [false, false, false],
    usuarios: [false, false, false],
    auditoria: [false, false, false],
  },
};

async function seed() {
  const client = await pool.connect();
  try {
    // Só grava a matriz na primeira vez. O seed roda a cada boot no Render
    // (free tier não tem Shell), e reescrever aqui apagaria as permissões
    // ajustadas na tela "Usuários & permissões" a cada vez que o serviço acorda.
    const { rows: permCount } = await client.query("SELECT COUNT(*)::int AS n FROM role_permissions");
    if (permCount[0].n === 0) {
      console.log("[seed] gravando matriz de permissões...");
      for (const [role, perms] of Object.entries(PERMISSIONS)) {
        for (const moduleKey of MODULES) {
          const [view, edit, del] = perms[moduleKey] || [false, false, false];
          await client.query(
            `INSERT INTO role_permissions (role, module_key, can_view, can_edit, can_delete)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (role, module_key)
             DO UPDATE SET can_view = $3, can_edit = $4, can_delete = $5`,
            [role, moduleKey, view, edit, del]
          );
        }
      }
    } else {
      console.log("[seed] matriz de permissões já existe, preservando as personalizações.");
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@agrorealpets.com.br";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "TrocarSenha123!";
    const { rows: existing } = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [adminEmail]
    );
    if (existing.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, status, cargo)
         VALUES ($1, $2, $3, 'administrador', 'ativo', 'Diretoria')`,
        ["Administrador", adminEmail, hash]
      );
      console.log(`[seed] usuário administrador criado: ${adminEmail} / senha: ${adminPassword}`);
      console.log("[seed] IMPORTANTE: troque essa senha assim que fizer o primeiro login.");
    } else {
      console.log("[seed] usuário administrador já existe, pulando.");
    }

    const { rows: bankCount } = await client.query("SELECT COUNT(*)::int AS n FROM bank_accounts");
    if (bankCount[0].n === 0) {
      await client.query(
        `INSERT INTO bank_accounts (nome_banco, agencia, conta, saldo_atual) VALUES
         ('Banco A — renomeie em Configurações', '0000', '00000-0', 0),
         ('Banco B — renomeie em Configurações', '0000', '00000-0', 0)`
      );
      console.log("[seed] dois bancos de exemplo criados (renomeie para os seus bancos reais).");
    }

    const { rows: costCount } = await client.query("SELECT COUNT(*)::int AS n FROM cost_centers");
    if (costCount[0].n === 0) {
      await client.query(
        `INSERT INTO cost_centers (nome) VALUES ('Administrativo'), ('Agropecuária'), ('Pet Shop'), ('Logística')`
      );
    }

    console.log("[seed] concluído.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] falhou:", err);
    process.exit(1);
  });
