# Guia Simples — Colocar o Sistema no Ar

Antes de começar, o que são os três sites:

- **Supabase** = o arquivo onde ficam guardados os dados (fornecedores, notas, contas).
- **Render** = o "motor" do sistema, que faz as contas funcionarem.
- **Netlify** = a tela que vocês vão abrir e usar no dia a dia.

Precisa fazer nesta ordem. Cada um depende do anterior. Reserve uns 30 minutos.

---

## PARTE 1 — O Supabase (onde os dados ficam)

*Se você já criou o projeto lá dentro, pule para o passo 5.*

1. Entre no site do Supabase e clique no botão verde **"New project"**.

2. Dê um nome qualquer, por exemplo: agro-erp

3. Ele vai pedir uma senha ("Database Password"). Crie uma senha forte e **anote num papel ou bloco de notas**. Você vai precisar dela daqui a pouco e ela não aparece de novo.

4. Em região ("Region"), escolha uma que tenha **South America**. Clique em criar e espere uns 2 minutos.

5. Agora vamos pegar 3 informações. Abra o menu de configurações (o ícone de engrenagem, "Project Settings"), e:

   **Informação 1** — clique em **"Database"**. Procure onde está escrito "Connection string" e escolha a opção **"URI"**. Vai aparecer um texto comprido começando com `postgresql://`. Copie ele inteiro.
   
   Nesse texto tem um pedaço escrito `[YOUR-PASSWORD]`. Apague esse pedaço (incluindo os colchetes) e escreva no lugar a senha que você anotou no passo 3.

   **Informação 2** — clique em **"API"**. Copie o endereço que aparece em "Project URL". É parecido com: https://algumacoisa.supabase.co

   **Informação 3** — na mesma tela, procure "service_role". Copie essa chave (é bem comprida).

6. Guarde as 3 num bloco de notas. **Não mande essas informações em grupo nem poste em lugar nenhum** — quem tiver elas consegue abrir todos os dados do sistema.

7. Ainda no Supabase, clique em **"Storage"** no menu do lado esquerdo. Clique em **"New bucket"**. No nome escreva exatamente: anexos

   Deixe desmarcada a opção "Public". Clique em salvar.

**Pronto, essa parte acabou.**

---

## PARTE 2 — O Render (o motor)

1. Entre no Render. Clique no botão **"New +"** (fica no topo).

2. Na lista que abrir, escolha a opção **"Blueprint"**.

   *Atenção: é "Blueprint" mesmo, não "Web Service". Escolhendo Blueprint ele já se configura sozinho e você digita muito menos.*

3. Vai aparecer a lista dos repositórios. Escolha **agro-erp**.

4. Ele vai ler as configurações sozinho e mostrar uma lista de campos vazios para preencher. Preencha assim:

   - Onde pedir **DATABASE_URL** → cole a Informação 1 (o texto comprido, já com a senha trocada)
   - Onde pedir **SUPABASE_URL** → cole a Informação 2
   - Onde pedir **SUPABASE_SERVICE_KEY** → cole a Informação 3
   - Onde pedir **SEED_ADMIN_EMAIL** → escreva o e-mail que você quer usar para entrar no sistema
   - Onde pedir **SEED_ADMIN_PASSWORD** → escreva a senha que você quer usar para entrar no sistema

   **Esses dois últimos são importantes.** Se deixar em branco, o sistema abre com uma senha padrão que está escrita no projeto — qualquer um que veja o projeto conseguiria entrar no financeiro de vocês.

5. Clique em **"Apply"** (ou "Create"). Agora espere. Demora uns 5 minutos e passa um monte de texto na tela — é normal, não precisa entender nada disso.

6. Quando terminar, no alto da página vai aparecer um endereço parecido com: https://agro-erp-backend.onrender.com

   **Copie e guarde esse endereço.**

7. Para conferir se funcionou: abra esse endereço no navegador colocando `/api/health` no final. Assim: https://agro-erp-backend.onrender.com/api/health

   Se aparecer na tela algo com `"ok":true`, deu certo. Pode parecer feio e sem desenho nenhum — é assim mesmo.

**Pronto, essa parte acabou.**

---

## PARTE 3 — O Netlify (a tela do sistema)

1. Entre no Netlify e abra o site do projeto.

2. Procure no menu **"Site configuration"** e depois **"Environment variables"**. Clique em adicionar uma nova.

   - No nome escreva exatamente: VITE_API_URL
   - No valor, cole o endereço do passo 6 da Parte 2 **e acrescente `/api` no final**.
   
   Ficando assim: https://agro-erp-backend.onrender.com/api

   **⚠️ Não esqueça o `/api` no final. Se esquecer, o site abre bonito mas fica tudo vazio e o login não funciona. É o erro mais comum.**

3. Ainda no Netlify, procure **"Build & deploy"** e depois **"Build settings"**. Olhe o campo chamado **"Publish directory"**:
   - Se estiver escrito `frontend/dist`, **apague** e deixe o campo vazio.
   - Se já estiver vazio, ou escrito só `dist`, não mexa.

4. Procure o botão **"Trigger deploy"** e escolha **"Deploy site"**. Espere uns 2 minutos.

5. Vai aparecer o endereço do site, algo como: https://algumnome123.netlify.app

   **Esse é o sistema de vocês.** Abra e veja.

**Pronto, tudo pronto.**

---

## PARA ENTRAR NO SISTEMA

O usuário administrador é criado sozinho, você não precisa fazer nada.

Entre com o e-mail e a senha que você escreveu na Parte 2, passo 4.

---

## DUAS COISAS QUE PARECEM DEFEITO MAS SÃO NORMAIS

1. Se ninguém usar o sistema por 15 minutos, ele "dorme". Na próxima vez que alguém abrir, demora uns 20 a 30 segundos para responder e parece travado. É só esperar. Isso acontece porque o plano é gratuito.

2. Passar muito texto branco na tela do Render enquanto instala é normal, não é erro.

---

## SE DER ERRADO

Tire foto ou print da tela com a mensagem de erro e mande. Não precisa tentar consertar sozinho.

Uma dica prática: faça uma parte de cada vez e avise quando terminar, em vez de tentar as três de uma vez — fica mais fácil descobrir onde parou se algo falhar.
