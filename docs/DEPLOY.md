# 🚀 Guia de deploy

Para quem vai colocar o sistema no ar. Escreva do jeito que preferir (Vercel, Netlify, Render, VM...): aqui está **o que o sistema precisa**, independentemente do serviço.

Onde está escrito "conferido em novembro de 2026", os limites dos planos grátis foram checados nessa data. Planos mudam: confirme antes de decidir.

---

## 1. Já pode usar de verdade na ONG?

**Como piloto, sim, se cumprir os mínimos abaixo e aceitar os riscos conhecidos.** Não é "pronto e blindado".

### Mínimos antes de colocar dados reais

- [ ] **HTTPS** (todos os serviços recomendados dão sozinhos)
- [ ] `NODE_ENV=production` e uma `JWT_SECRET` **nova e longa**. A API recusa subir com uma chave curta ou copiada do exemplo.
- [ ] `CORS_ORIGIN` configurado (ou o site repassando `/api`, veja a seção 4)
- [ ] **Senha forte** no admin (ele é obrigado a trocar no primeiro acesso)
- [ ] `frontend/src/config/organizacao.js` preenchido, sem nenhum `[PREENCHER...]`. Enquanto tiver, o aviso de "Rascunho" aparece para todo mundo nas páginas de Privacidade e Termos. Veja `docs/PENDENCIAS_LGPD.md`.
- [ ] **Backup:** pelo menos um `pg_dump` manual periódico, guardado fora do servidor (seção 5)
- [ ] **Teste com o grupo** no navegador, no celular e no computador, **com dados fictícios**, num ambiente separado
- [ ] O banco de produção começa **limpo**: sem os dados fictícios dos testes

### Riscos conhecidos (ficaram para o próximo período)

- **Não há limite de tentativas no login.** Alguém pode testar muitas senhas. Mitigação: senhas fortes para todos. Se suspeitar de algo, trocar a `JWT_SECRET` desloga todo mundo.
- Não há cabeçalhos extras de segurança (`helmet`) nem registro das ações de administrador.
- Não há backup automático, exportação para PDF/Excel, "esqueci a senha" por e-mail (o admin redefine) nem avisos por e-mail ou WhatsApp.
- O sistema ainda foi pouco testado em uso real: podem existir bugs de tela.

Detalhes de LGPD: `docs/LGPD.md`.

---

## 2. As 3 peças

| Peça | Pasta | Como colocar no ar |
|---|---|---|
| **Site** (React, arquivos estáticos) | `frontend/` | `npm install` e `npm run build`. Publicar a pasta **`dist`**. Precisa mandar qualquer endereço para o `index.html` (já incluído: `vercel.json` para Vercel e `public/_redirects` para Netlify e Cloudflare Pages) |
| **API** (Node + Express) | `backend/` | Node **20 ou mais novo**. `npm install` e `npm start`. A porta vem da variável `PORT` |
| **Banco** (PostgreSQL) | `backend/database/` | Qualquer PostgreSQL 14+. Rodar o `schema.sql` uma vez |

---

## 3. Variáveis de ambiente

**API** (configure no painel do serviço, nunca no GitHub):

| Variável | Valor | Observação |
|---|---|---|
| `DATABASE_URL` | Endereço de conexão do banco | |
| `DB_SSL` | `true` em banco gerenciado (Neon, Supabase...); `false` em banco local | |
| `JWT_SECRET` | Chave nova, longa e aleatória | Gerar: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRA` | `8h` | Quanto tempo dura o login |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | Endereço do site, ex.: `https://estoque.suaong.org.br` | Vários? Separe por vírgula. Não precisa na opção B abaixo |
| `PORT` | | A maioria dos serviços define sozinha |

**Site:**

| Variável | Valor | Observação |
|---|---|---|
| `VITE_API_URL` | Endereço público da API, sem barra no final | Vai para dentro do site **na hora do build**: se mudar, é preciso **refazer o deploy**. Não coloque segredos aqui |

---

## 4. Como o site encontra a API (escolha uma)

**Opção A: endereços diferentes** (a mais comum)
- Site em `https://estoque.suaong.org.br`, API em `https://api-estoque.exemplo.com`
- No site: `VITE_API_URL=https://api-estoque.exemplo.com`
- Na API: `CORS_ORIGIN=https://estoque.suaong.org.br`

**Opção B: mesmo endereço** (o servidor do site repassa `/api` para a API)
- Deixe `VITE_API_URL` **vazia** e não precisa de `CORS_ORIGIN`.
- Vercel: no `frontend/vercel.json`, acrescente antes da regra existente:
  ```json
  {
    "rewrites": [
      { "source": "/api/:path*", "destination": "https://SUA-API/api/:path*" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- Netlify: no `frontend/public/_redirects`, deixe assim:
  ```
  /api/*  https://SUA-API/api/:splat  200
  /*      /index.html                 200
  ```
- Nginx (VM): `location /api/ { proxy_pass http://127.0.0.1:3001; }` e, no resto, `try_files $uri /index.html;`

---

## 5. Banco de dados

1. Crie um banco PostgreSQL e rode **uma vez** o conteúdo de `backend/database/schema.sql` (no editor SQL do serviço ou com `psql`). **Nunca rode o `reset.sql`**: ele apaga tudo.
2. Ajuste o fuso do banco para Brasília (sem isso, "vence hoje" vira às 21h):
   ```sql
   ALTER DATABASE nome_do_banco SET timezone TO 'America/Sao_Paulo';
   ```
3. Crie o primeiro administrador, rodando na sua máquina, dentro de `backend/`, apontando para o banco de produção.
   PowerShell:
   ```powershell
   $env:DATABASE_URL="COLE_A_CONNECTION_STRING"
   $env:DB_SSL="true"
   node scripts/criar-admin.js "Nome do Admin" email@da-ong.org SenhaForte123
   ```
   Linux ou Mac:
   ```bash
   DATABASE_URL="COLE_A_CONNECTION_STRING" DB_SSL=true node scripts/criar-admin.js "Nome do Admin" email@da-ong.org SenhaForte123
   ```
   Depois **feche o terminal** (para o seu ambiente de desenvolvimento não ficar apontando para a produção). No primeiro login, o sistema obriga a trocar a senha. Os demais usuários o admin cria na tela **Usuários**.
4. **Mudanças futuras no banco:** rode os arquivos novos de `backend/database/migrations/`, em ordem, no banco de produção.
5. **Backup:**
   ```bash
   pg_dump "COLE_A_CONNECTION_STRING" > backup-AAAA-MM-DD.sql
   ```
   Guarde fora do servidor e **fora do GitHub** (o arquivo tem dados pessoais). Teste restaurar uma vez para saber que funciona.

---

## 6. Opções de serviços

| Peça | Opção | O que saber |
|---|---|---|
| Site | **Vercel**, **Netlify** ou **Cloudflare Pages** | Pasta base `frontend`, comando `npm run build`, publicar `dist`, variável `VITE_API_URL` |
| API | **Render** (conferido): *Root Directory* `backend`, *Build* `npm install`, *Start* `npm start` | O plano grátis **dorme após 15 minutos** sem uso e leva cerca de **1 minuto** para acordar no primeiro acesso |
| API | **Railway**, **Fly.io** ou outro | Serve qualquer lugar que rode Node 20+, aceite variáveis de ambiente e mantenha o processo ligado. Não conferi os limites atuais |
| API | **VM** (Oracle, VPS...) | Node 20, PM2 (`pm2 start src/server.js --name ong-estoque-api`, `pm2 save`, `pm2 startup`), HTTPS com Caddy ou Nginx e um domínio. **Não deixe a porta 5432 do PostgreSQL aberta para a internet.** Firewall só com 80 e 443 |
| Banco | **Neon** (conferido): grátis com 0,5 GB e 100 CU-horas por mês, suspende quando fica parado | Sobra para este sistema |
| Banco | Supabase, Railway, banco na própria VM | Não conferi os limites atuais |

> ⚠️ **Não use o PostgreSQL grátis do Render**: ele **expira 30 dias após a criação** (conferido), e os dados da ONG seriam apagados.

---

## 7. Depois de subir, confira

1. `https://SUA-API/api/saude` mostra `{"status":"ok","banco":"conectado","categorias":6}`
2. O site abre, e **recarregar** uma página interna (ex.: `/estoque`) não dá 404
3. Login com o admin, troca de senha obrigatória, e depois o Painel
4. Criar um usuário "Somente consulta" e entrar com ele numa janela anônima
5. Registrar uma doação, dar saída e ver o Histórico
6. Abrir no **celular**

---

## 8. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| A API não sobe e fala em **"JWT_SECRET fraco"** | A chave é curta ou é a do exemplo. Gere uma nova (seção 3) |
| **"Não foi possível conectar ao servidor"** | A API está dormindo (Render grátis: espere cerca de 1 minuto), o `VITE_API_URL` está errado ou o navegador está **bloqueando por CORS** (aperte F12 e veja o console; ajuste o `CORS_ORIGIN`) |
| **"Não foi possível encontrar o servidor da API"** | `VITE_API_URL` vazia sem o redirecionamento de `/api` (opção B), ou endereço errado |
| 404 ao recarregar uma página | Falta mandar tudo para o `index.html` (`vercel.json` ou `_redirects`) |
| Erro `relation "..." does not exist` | O `schema.sql` não foi rodado nesse banco |
| Erro de conexão com o banco | `DATABASE_URL` errada ou `DB_SSL` no valor errado |
| Mudei o `VITE_API_URL` e nada mudou | Ela vai para dentro do site no build: refaça o deploy do site |
| "Vence hoje" com o dia errado | Falta ajustar o fuso do banco (seção 5, passo 2) |
| Usuário novo cai direto na tela "Primeiro acesso" | É o esperado: ele precisa trocar a senha temporária |

---

## 9. Depois de colocar no ar

- **Quem tem acesso aos painéis dos serviços e ao banco tem acesso aos dados pessoais.** Poucas pessoas, senhas fortes e verificação em duas etapas nas contas.
- **Atualizações:** ligue o deploy automático só à branch `main` e só faça merge depois de testar.
- **Se suspeitar de vazamento:** troque a `JWT_SECRET` (desloga todos), troque a senha do banco, desative usuários suspeitos e siga `docs/LGPD.md`, seção 7.
- **Avise a ONG:** no plano grátis da API, o primeiro acesso depois de um tempo parado demora cerca de 1 minuto.

---

## 10. Atualizando o sistema depois de no ar

Dá para ir mexendo e atualizando sem problema, desde que a regra seja: **a `main` é a versão que a ONG usa**. Tudo passa por branch, teste e Pull Request antes de entrar nela.

| O que mudou | Como é a atualização |
|---|---|
| **Só telas** (frontend) | A mais tranquila. Merge na `main` e o serviço publica sozinho em poucos minutos |
| **A API** (backend) | O serviço reinicia a API no deploy. No plano grátis pode ficar alguns minutos fora. As pessoas **não são deslogadas** (o login continua valendo) |
| **O banco** (coluna ou tabela nova) | **Exige um passo extra: a migração** (veja abaixo) |
| **Variáveis de ambiente** | Mude no painel do serviço e reinicie ou refaça o deploy. A `VITE_API_URL` exige novo build do site |

### Mudou o banco? Nesta ordem

1. Faça um **backup** (`pg_dump`, seção 5).
2. Crie um arquivo novo em `backend/database/migrations/` (ex.: `002_nome_da_mudanca.sql`), escrito para poder rodar mais de uma vez (`IF NOT EXISTS`). **Atualize também o `schema.sql`**, para quem for criar um banco novo.
3. Rode a migração no **banco de produção** (editor SQL do serviço). Se a mudança só **acrescenta** coisas (coluna ou tabela nova), faça isso **antes** de publicar o código que depende dela.
4. Publique o código e confira.

Nunca rode o `reset.sql`. Evite apagar ou renomear colunas de uma vez: faça em duas etapas, para dar para voltar atrás.

### Boas práticas

- **Teste antes de mesclar**, no seu computador, com dados fictícios. Vercel e Netlify criam um endereço de teste por branch, mas ele costuma falar com a **mesma API e o mesmo banco de produção**. Não teste com dados reais ali.
- **Se algo der errado:** reverta o commit problemático (`git revert`) e faça push na `main` para voltar à versão anterior. Alguns serviços também deixam republicar uma versão anterior pelo painel (confira onde vocês hospedarem). Por isso as migrações devem ser aditivas: uma mudança no banco já aplicada não volta sozinha.
- **Mudou uma rota da API?** Atualize o `docs/API.md`. **Mudou algum passo de instalação?** Atualize o `README.md`.
- Prefira atualizar em horário de pouco uso e avise a ONG antes de mudanças grandes.