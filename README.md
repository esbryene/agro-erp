# Agro Real & Pet's — ERP Financeiro

Sistema financeiro completo: fornecedores, notas fiscais (com importação de
XML de NF-e), contas a pagar (com recorrência), contas a receber, conciliação
bancária (dois bancos, importação de extrato em Excel), relatórios, usuários
e permissões por perfil, e log de auditoria.

## Arquitetura

- **backend/** — API em Node.js + Express, banco PostgreSQL, autenticação
  JWT + bcrypt, upload de arquivos (XML, PDF, boletos, extratos).
- **frontend/** — SPA em React (Vite) + Tailwind, consumindo a API.
- **docker-compose.yml** — sobe os três serviços (banco, backend, frontend)
  já prontos para produção num VPS.

## Passo a passo para colocar no ar (VPS com Docker)

### 1. Pré-requisitos no servidor
- Docker e Docker Compose instalados (`docker --version`, `docker compose version`).
- Uma porta liberada no firewall para o site (ex: 80/443) e, se quiser acesso
  direto à API, a porta 4000.

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
nano .env   # defina POSTGRES_PASSWORD e JWT_SECRET com valores fortes e únicos
```

### 3. Subir os containers
```bash
docker compose up -d --build
```
Isso cria o banco, roda as migrations automaticamente (via `migrate.js` no
entrypoint do backend) e sobe o frontend já compilado atrás do Nginx.

### 4. Popular dados iniciais (usuário administrador + permissões + bancos)
```bash
docker compose exec backend node src/seed.js
```
O terminal vai mostrar o e-mail e a senha temporária do administrador — troque
essa senha assim que fizer o primeiro login (Usuários & permissões → editar
seu usuário).

Se quiser definir o e-mail/senha do admin você mesmo, rode com variáveis:
```bash
docker compose exec -e SEED_ADMIN_EMAIL=voce@agrorealpets.com.br \
                     -e SEED_ADMIN_PASSWORD='umaSenhaForte123!' \
                     backend node src/seed.js
```

### 5. Acessar
- Site: `http://SEU_IP:8080` (ou o domínio, se configurar um proxy reverso/HTTPS na frente — recomendado, veja abaixo).
- API (se precisar testar direto): `http://SEU_IP:4000/api/health`

## Recomendado para produção "de verdade"

1. **HTTPS**: coloque um proxy reverso na frente (Nginx, Caddy ou Traefik) com
   Let's Encrypt/Certbot para o site rodar em `https://` com certificado válido.
   Sem isso, senhas trafegam sem criptografia de transporte.
2. **Backups do banco**: agende `pg_dump` periódico do container `db` para um
   local externo (outro servidor, S3, etc). Exemplo manual:
   ```bash
   docker compose exec db pg_dump -U agro_erp agro_erp > backup_$(date +%F).sql
   ```
3. **Backups dos anexos**: o volume `uploads_data` guarda os XMLs, PDFs e
   extratos importados — inclua-o na rotina de backup também.
4. **Firewall**: exponha só as portas 80/443 publicamente; mantenha 4000 e o
   Postgres acessíveis apenas internamente (remova o mapeamento `4000:4000`
   do `docker-compose.yml` depois que o proxy reverso estiver configurado).
5. **Atualizações**: `docker compose pull && docker compose up -d --build`
   depois de qualquer mudança no código.

## Estrutura de permissões

Os perfis (Administrador, Financeiro, Compras, Gerência, Consulta) e a matriz
de quem vê/edita/exclui cada módulo ficam nas tabelas `roles` e
`role_permissions`, editáveis diretamente na tela **Usuários & permissões**
do sistema (só quem tem permissão de editar em "usuarios" consegue mexer).

## Importação de XML de NF-e

Em **Notas fiscais**, arraste o `.xml` da nota — o sistema cria (ou reaproveita,
pelo CNPJ) o fornecedor automaticamente e lança todos os itens, impostos e
totais. Funciona com o XML de distribuição padrão da Receita/SEFAZ.

## Conciliação bancária

Cadastre seus bancos reais em **Conciliação bancária** (o seed já cria dois
registros de exemplo — "Banco A" e "Banco B" — renomeie-os para os seus
bancos de verdade). Ao importar o extrato (.xlsx/.xls/.csv), o sistema:
- reconhece automaticamente colunas de data, descrição, valor (ou
  crédito/débito separados) e saldo;
- sugere vínculo com títulos do contas a pagar quando o valor bate e o
  vencimento está próximo da data do lançamento;
- permite classificar cada linha (Receita, Fornecedor, Energia, Água,
  Internet, Telefone, Devolução, Tarifa bancária, Transferência...).

## Desenvolvimento local (sem Docker)

```bash
# Banco local via Docker (só o Postgres)
docker run -d --name agro-erp-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=agro_erp -p 5432:5432 postgres:16-alpine

# Backend
cd backend
cp .env.example .env 2>/dev/null || true
echo 'DATABASE_URL=postgres://postgres:postgres@localhost:5432/agro_erp' >> .env
echo 'JWT_SECRET=dev-secret-troque-em-producao' >> .env
npm install
npm run migrate
npm run seed
npm start        # API em http://localhost:4000

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev       # Site em http://localhost:5173 (proxy automático para a API)
```

## Próximos passos sugeridos

- Integração com a Receita Federal para consulta automática de CNPJ.
- Emissão de boletos e integração bancária (Open Finance) para conciliação 100% automática.
- Autenticação em dois fatores (a coluna `two_factor_enabled` já existe no banco, falta a UI).
- Módulos de estoque, vendas e fluxo de caixa consolidado (a base do banco já foi desenhada pensando nessa expansão).
