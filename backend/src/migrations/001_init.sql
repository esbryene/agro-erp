-- Agro Real & Pet's ERP — schema inicial
-- Convenção: valores monetários em NUMERIC(14,2); datas em DATE; timestamps em TIMESTAMPTZ.

CREATE TABLE IF NOT EXISTS roles (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL
);

INSERT INTO roles (key, label) VALUES
  ('administrador', 'Administrador'),
  ('financeiro', 'Financeiro'),
  ('compras', 'Compras'),
  ('gerencia', 'Gerência'),
  ('consulta', 'Consulta')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS modules (
  key   TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

INSERT INTO modules (key, label) VALUES
  ('dashboard', 'Dashboard'),
  ('fornecedores', 'Fornecedores'),
  ('notas', 'Notas fiscais'),
  ('contas_pagar', 'Contas a pagar'),
  ('contas_receber', 'Contas a receber'),
  ('conciliacao', 'Conciliação bancária'),
  ('relatorios', 'Relatórios'),
  ('usuarios', 'Usuários'),
  ('auditoria', 'Auditoria')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_permissions (
  role        TEXT NOT NULL REFERENCES roles(key) ON DELETE CASCADE,
  module_key  TEXT NOT NULL REFERENCES modules(key) ON DELETE CASCADE,
  can_view    BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (role, module_key)
);

CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  cpf                 TEXT,
  telefone            TEXT,
  cargo               TEXT,
  departamento        TEXT,
  role                TEXT NOT NULL REFERENCES roles(key),
  status              TEXT NOT NULL DEFAULT 'ativo',
  foto_url            TEXT,
  failed_logins       INT NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  two_factor_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  success     BOOLEAN NOT NULL,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  ip          TEXT,
  user_agent  TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id    SERIAL PRIMARY KEY,
  nome  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS financial_categories (
  id    SERIAL PRIMARY KEY,
  nome  TEXT NOT NULL UNIQUE
);

INSERT INTO financial_categories (nome) VALUES
  ('Produtos'), ('Fretes'), ('Serviços'), ('Impostos'),
  ('Energia'), ('Água'), ('Internet'), ('Telefone'), ('Folha'), ('Outros')
ON CONFLICT (nome) DO NOTHING;

CREATE TABLE IF NOT EXISTS suppliers (
  id                  SERIAL PRIMARY KEY,
  razao_social        TEXT NOT NULL,
  nome_fantasia       TEXT,
  cnpj                TEXT NOT NULL UNIQUE,
  inscricao_estadual  TEXT,
  inscricao_municipal TEXT,
  endereco            TEXT,
  numero              TEXT,
  complemento         TEXT,
  bairro              TEXT,
  cidade              TEXT,
  estado              TEXT,
  cep                 TEXT,
  telefone            TEXT,
  whatsapp            TEXT,
  email               TEXT,
  contato_nome        TEXT,
  banco               TEXT,
  agencia             TEXT,
  conta               TEXT,
  pix                 TEXT,
  observacoes         TEXT,
  status              TEXT NOT NULL DEFAULT 'ativo',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id                SERIAL PRIMARY KEY,
  supplier_id       INT NOT NULL REFERENCES suppliers(id),
  numero            TEXT NOT NULL,
  serie             TEXT,
  chave_nfe         TEXT UNIQUE,
  data_emissao      DATE,
  data_entrada      DATE,
  valor_produtos    NUMERIC(14,2) DEFAULT 0,
  frete             NUMERIC(14,2) DEFAULT 0,
  seguro            NUMERIC(14,2) DEFAULT 0,
  desconto          NUMERIC(14,2) DEFAULT 0,
  outras_despesas   NUMERIC(14,2) DEFAULT 0,
  valor_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacoes       TEXT,
  status            TEXT NOT NULL DEFAULT 'pendente',
  xml_path          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id             SERIAL PRIMARY KEY,
  invoice_id     INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  codigo         TEXT,
  descricao      TEXT NOT NULL,
  quantidade     NUMERIC(14,3) NOT NULL DEFAULT 1,
  unidade        TEXT,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_total    NUMERIC(14,2) NOT NULL DEFAULT 0,
  ncm            TEXT,
  cfop           TEXT,
  ean            TEXT,
  marca          TEXT,
  categoria      TEXT
);

CREATE TABLE IF NOT EXISTS service_invoices (
  id            SERIAL PRIMARY KEY,
  supplier_id   INT NOT NULL REFERENCES suppliers(id),
  numero        TEXT NOT NULL,
  data_emissao  DATE,
  competencia   TEXT,
  descricao     TEXT,
  valor         NUMERIC(14,2) NOT NULL DEFAULT 0,
  iss           NUMERIC(14,2) DEFAULT 0,
  retencoes     NUMERIC(14,2) DEFAULT 0,
  observacoes   TEXT,
  pdf_path      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id                  SERIAL PRIMARY KEY,
  descricao           TEXT NOT NULL,
  tipo                TEXT NOT NULL,
  intervalo_meses     INT NOT NULL DEFAULT 1,
  valor_parcela       NUMERIC(14,2) NOT NULL,
  quantidade_parcelas INT NOT NULL,
  primeiro_vencimento DATE NOT NULL,
  supplier_id         INT REFERENCES suppliers(id),
  categoria_id        INT REFERENCES financial_categories(id),
  centro_custo_id     INT REFERENCES cost_centers(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payables (
  id                SERIAL PRIMARY KEY,
  supplier_id       INT NOT NULL REFERENCES suppliers(id),
  invoice_id        INT REFERENCES invoices(id),
  recurring_rule_id INT REFERENCES recurring_rules(id),
  documento         TEXT,
  numero_boleto     TEXT,
  banco             TEXT,
  linha_digitavel   TEXT,
  codigo_barras     TEXT,
  valor             NUMERIC(14,2) NOT NULL,
  data_emissao      DATE,
  data_vencimento   DATE NOT NULL,
  data_pagamento    DATE,
  forma_pagamento   TEXT,
  centro_custo_id   INT REFERENCES cost_centers(id),
  categoria_id      INT REFERENCES financial_categories(id),
  observacoes       TEXT,
  boleto_path       TEXT,
  status            TEXT NOT NULL DEFAULT 'pendente',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  cpf         TEXT UNIQUE,
  endereco    TEXT,
  telefone    TEXT,
  email       TEXT,
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receivables (
  id               SERIAL PRIMARY KEY,
  customer_id      INT NOT NULL REFERENCES customers(id),
  data_venda       DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento  DATE NOT NULL,
  prazo_dias       INT NOT NULL DEFAULT 30,
  data_recebimento DATE,
  valor_total      NUMERIC(14,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'a_vencer',
  observacoes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receivable_items (
  id             SERIAL PRIMARY KEY,
  receivable_id  INT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  descricao      TEXT NOT NULL,
  quantidade     NUMERIC(14,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id           SERIAL PRIMARY KEY,
  nome_banco   TEXT NOT NULL,
  agencia      TEXT,
  conta        TEXT,
  saldo_atual  NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id              SERIAL PRIMARY KEY,
  bank_account_id INT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  descricao       TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  valor           NUMERIC(14,2) NOT NULL,
  saldo           NUMERIC(14,2),
  classificacao   TEXT NOT NULL DEFAULT 'Não classificado',
  conciliado      BOOLEAN NOT NULL DEFAULT FALSE,
  payable_id      INT REFERENCES payables(id),
  import_batch    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attachments (
  id            SERIAL PRIMARY KEY,
  entity_type   TEXT NOT NULL,
  entity_id     INT NOT NULL,
  tipo          TEXT,
  path          TEXT NOT NULL,
  original_name TEXT,
  uploaded_by   INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payables_vencimento ON payables (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_receivables_vencimento ON receivables (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_bank_tx_account ON bank_transactions (bank_account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices (supplier_id);
