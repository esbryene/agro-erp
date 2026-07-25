# Como publicar o Agro Real & Pet's ERP de graça

Esse sistema tem 3 partes, cada uma hospedada num serviço grátis diferente:

| Parte | Onde |
|---|---|
| Frontend (a tela que o usuário vê) | Netlify |
| Backend (a API) | Render |
| Banco de dados | Supabase |

Faça nessa ordem — cada parte depende da anterior.

---

## Parte 1 — Banco de dados no Supabase

1. Entre em **supabase.com** e crie uma conta grátis
2. Clique em **"New project"**
3. Dê um nome (ex: "agro-erp"), crie uma senha forte pro banco (**guarde essa senha**) e escolha a região mais próxima (South America)
4. Espere o projeto ser criado (leva ~2 minutos)
5. Vá em **Project Settings → Database**, procure **"Connection string"**, modo **"URI"**, e copie o link. Ele parece com:
   `postgresql://postgres:[SUA-SENHA]@db.xxxx.supabase.co:5432/postgres`
   Troque `[SUA-SENHA]` pela senha que você criou
6. Vá em **Project Settings → API** e copie:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **service_role key** (uma chave longa, em "Project API keys")
7. Vá em **Storage** (menu lateral), clique em **"New bucket"**, nome: `anexos`, deixe como **privado** (não marque "Public")

Guarde essas 3 informações (connection string, Project URL, service_role key) — vai usar no Render daqui a pouco.

---

## Parte 2 — Backend no Render

1. Entre em **render.com** e crie uma conta grátis (dá pra usar "Sign up with GitHub")
2. Clique em **"New +"** → **"Web Service"**
3. Conecte sua conta do GitHub e escolha o repositório do projeto
4. Preencha:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/migrate.js && node src/seed.js && node src/index.js`
   - **Plan**: Free
5. Em **"Environment Variables"**, adicione:
   - `DATABASE_URL` → a connection string do Supabase (Parte 1, passo 5)
   - `SUPABASE_URL` → o Project URL (Parte 1, passo 6)
   - `SUPABASE_SERVICE_KEY` → a service_role key (Parte 1, passo 6)
   - `SUPABASE_BUCKET` → `anexos`
   - `JWT_SECRET` → qualquer frase longa e aleatória (ex: `um-segredo-bem-grande-e-dificil-de-adivinhar-123`)
   - `SEED_ADMIN_EMAIL` → o e-mail que você quer usar para entrar no sistema
   - `SEED_ADMIN_PASSWORD` → a senha que você quer usar (escolha uma forte)

   ⚠️ Os dois últimos são importantes: se você não definir, o sistema sobe com
   e-mail e senha padrão que estão escritos no código — ou seja, qualquer pessoa
   que veja o projeto conseguiria entrar no seu financeiro.
6. Clique em **"Create Web Service"**

Espere o deploy terminar (alguns minutos). No topo da página vai aparecer o endereço do backend, tipo:
`https://agro-erp-backend.onrender.com`

**Guarde esse endereço** — você vai precisar dele no Netlify.

Teste se funcionou: abra `https://SEU-ENDERECO.onrender.com/api/health` no navegador — deve aparecer algo como `{"ok":true, ...}`.

---

## Parte 3 — Frontend no Netlify

1. Entre em **netlify.com**, crie conta grátis (com GitHub)
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Escolha **"Deploy with GitHub"**, autorize, e selecione o repositório
4. O Netlify já detecta o `netlify.toml` do projeto e preenche sozinho o comando de build e a pasta de publicação — **não precisa mexer em nada aqui**
5. Antes de clicar em Deploy, clique em **"Add environment variables"** e adicione:
   - `VITE_API_URL` → `https://SEU-ENDERECO-DO-RENDER.onrender.com/api` (o endereço da Parte 2, com `/api` no final)
6. Clique em **"Deploy site"**

Espere terminar. Vai aparecer o link do site, tipo `https://algumnome123.netlify.app` — esse é o ERP publicado!

---

## Depois de publicar: entrar no sistema

O usuário administrador é criado **sozinho**, na primeira vez que o backend sobe
no Render (faz parte do Start Command). Você não precisa rodar nenhum comando.

Entre no site publicado (Netlify) com o e-mail e a senha que você definiu nas
variáveis `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (Parte 2, passo 5).

Se você não definiu essas duas variáveis, o login padrão é
`admin@agrorealpets.com.br` / `TrocarSenha123!` — nesse caso **troque a senha
imediatamente** em Usuários & permissões → editar seu usuário, porque essa senha
é pública.

> Por que não é manual: a aba "Shell" do Render, usada para rodar comandos à mão,
> só existe nos planos pagos. Por isso a criação inicial roda junto com o start.
> Ela é segura de repetir: não duplica usuário, não reseta sua senha e não
> desfaz as permissões que você personalizar nas telas do sistema.

---

## Coisas importantes sobre o plano grátis

- **O backend "dorme"** depois de 15 minutos sem uso. Na próxima vez que alguém acessar, demora uns 20–30 segundos pra "acordar" — é normal, não é erro.
- **O banco (Supabase) tem 500MB grátis** — dá pra bastante lançamento, mas não é ilimitado.
- **Os anexos (XML, boletos, PDFs)** ficam guardados no Supabase Storage (bucket "anexos"), não se perdem quando o backend reinicia.
- Sempre que você (ou o Claude Code) enviar uma atualização pro GitHub, tanto Render quanto Netlify **atualizam sozinhos automaticamente** — não precisa fazer nada manual depois da primeira configuração.
