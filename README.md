# 📦 Sistema de Gestão de Estoque — ONG Sonho de Um Menino

Sistema web para organizar as doações recebidas pela ONG **Sonho de Um Menino**, com controle por data de validade, alertas de vencimento e busca/filtro rápido.

Projeto de extensão (Práticas Extensionistas), desenvolvido em grupo, como continuação do chatbot de WhatsApp já em operação para a mesma ONG.

## 📌 Status

| Parte | Situação |
|---|---|
| Banco de dados (PostgreSQL) | ✅ Pronto |
| Backend (API em Node + Express) | ✅ Pronto para o MVP |
| Frontend (React) | 🚧 Em desenvolvimento (tela de login criada, ainda não ligada na API) |
| Deploy | ⏳ A fazer |

## ✨ Funcionalidades do MVP

- 🔐 Login com e-mail e senha, com perfis **admin** e **voluntário**
- 📋 Cadastro de itens, categorias e doadores
- 📥 Registro de doações: cada doação vira um **lote**, com validade e quantidade próprias
- 📤 Saída de estoque (distribuição), sem deixar o estoque ficar negativo
- ⏰ Painel de validade: lotes **vencidos**, **vencendo** (próximos 30 dias) e **ok**
- 🔍 Busca e filtros por item, categoria, doador e status
- 🧾 Histórico de tudo que entra e sai, com o nome de quem fez
- 👥 Gestão de usuários (só admin)

> Exportação de relatórios em PDF/Excel fica para o próximo período.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL |
| Autenticação | JWT + bcrypt |
| Deploy (planejado) | Vercel (frontend) + Oracle Cloud Free Tier **ou** Render (backend e banco) |

## 📁 Estrutura do projeto

```
ong-estoque/
├── backend/
│   ├── database/
│   │   └── schema.sql          # tabelas do banco
│   ├── scripts/
│   │   └── criar-admin.js      # cria o primeiro usuário administrador
│   ├── src/
│   │   ├── middleware/         # login e permissões
│   │   ├── routes/             # rotas da API
│   │   ├── utils/              # funções auxiliares
│   │   ├── db.js               # conexão com o banco
│   │   └── server.js           # servidor
│   ├── .env.example            # modelo das variáveis de ambiente
│   └── package.json
├── frontend/                   # aplicação React
├── docs/
│   └── API.md                  # documentação de todas as rotas da API
└── README.md
```

## 🚀 Como rodar na sua máquina

Siga na ordem. Cada pessoa roda **o próprio banco local**, então os dados de teste não são compartilhados.

### 0. O que precisa estar instalado

| Programa | Observação |
|---|---|
| [Git](https://git-scm.com/) | |
| [Node.js](https://nodejs.org/) | Versão 20 ou mais nova (LTS) |
| [PostgreSQL](https://www.postgresql.org/download/) | Vem com o **pgAdmin**. Anote a senha que você definir na instalação |
| [VS Code](https://code.visualstudio.com/) | Opcional, mas recomendado |

Para conferir o Node: `node -v`.

### 1. Clonar o repositório

```bash
git clone https://github.com/Andre-Mour4/ong-estoque.git
cd ong-estoque
```

> Rode um comando por vez, apertando Enter entre eles.

### 2. Criar o banco de dados

**Pelo pgAdmin (mais fácil):**

1. Abra o pgAdmin e conecte no servidor (vai pedir a senha do PostgreSQL).
2. Clique com o botão direito em **Databases > Create > Database...**, nomeie como `ong_estoque` e salve.
3. Clique com o botão direito no `ong_estoque` > **Query Tool**.
4. Abra o arquivo `backend/database/schema.sql` (ícone de pasta) e execute (botão de play ou **F5**).
5. Confira em `ong_estoque > Schemas > public > Tables` (botão direito > Refresh): devem existir 6 tabelas: `usuarios`, `categorias`, `doadores`, `itens`, `lotes` e `movimentacoes`.

**Ou pelo terminal**, na raiz do projeto:

```bash
psql -U postgres -c "CREATE DATABASE ong_estoque;"
psql -U postgres -d ong_estoque -f backend/database/schema.sql
```

> O `schema.sql` é seguro: pode ser rodado de novo sem apagar nada. Para **zerar** o banco em desenvolvimento, rode antes o `backend/database/reset.sql` (⚠️ apaga tudo; nunca use em banco com dados reais). Se você criou o banco antes, rode também os arquivos de `backend/database/migrations/`, em ordem.

### 3. Configurar o backend

```bash
cd backend
npm install
```

Crie o seu arquivo de configuração a partir do modelo (ele fica dentro da pasta `backend`, ao lado do `package.json`):

```bash
cp .env.example .env
```

Abra o `.env` e preencha. Ele deve ficar assim:

```
PORT=3001
DATABASE_URL=postgresql://postgres:SUA_SENHA_DO_POSTGRES@localhost:5432/ong_estoque
DB_SSL=false
JWT_SECRET=cole_aqui_o_texto_gigante_gerado_no_comando
JWT_EXPIRA=8h
```

| Variável | O que colocar |
|---|---|
| `PORT` | Deixe `3001` |
| `DATABASE_URL` | Troque `SUA_SENHA_DO_POSTGRES` pela senha que você definiu ao instalar o PostgreSQL |
| `DB_SSL` | Deixe `false` no banco local |
| `JWT_SECRET` | A chave secreta dos logins (veja abaixo) |
| `JWT_EXPIRA` | Quanto tempo o login dura. Deixe `8h` |

#### 🔑 Como gerar o `JWT_SECRET` (a "senha enorme")

É uma chave aleatória que o servidor usa para assinar os logins. Gere a sua rodando no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Vai aparecer um texto grande, tipo `9f3a1c...`. **Copie tudo** e cole no `.env`, no lugar de `cole_aqui_o_texto_gigante_gerado_no_comando`, assim:

```
JWT_SECRET=9f3a1c...o texto inteiro que apareceu...
```

Regras:

- Cada pessoa gera a **sua** chave. Não precisa ser igual à dos outros.
- **Nunca** coloque a chave real no `.env.example` nem em mensagem de grupo. O `.env` não vai pro GitHub (está no `.gitignore`).
- No deploy, será gerada uma chave nova só para produção.

Se a senha do PostgreSQL tiver caracteres especiais (`@`, `#`, `/`, `:`), eles precisam ser codificados na `DATABASE_URL` (por exemplo, `@` vira `%40`).

### 4. Criar o seu usuário administrador

Ainda dentro de `backend/`:

```bash
node scripts/criar-admin.js "Seu Nome" seuemail@exemplo.com SuaSenha123
```

A senha precisa ter **no mínimo 8 caracteres**. Use só letras e números para o terminal não se confundir. Deve aparecer `Administrador criado:`. Esse e-mail e senha são o seu login no sistema. A senha é **temporária**: no primeiro acesso o sistema pede para trocá-la. Enquanto a tela de trocar senha não estiver pronta no frontend, acrescente `--sem-troca` ao final do comando (só em desenvolvimento).

### 5. Rodar o backend

```bash
npm run dev
```

Deve aparecer `API rodando em http://localhost:3001`. O servidor reinicia sozinho quando você salva um arquivo `.js`. **Mudou o `.env`?** Aperte `Ctrl+C` e rode `npm run dev` de novo.

Para testar, abra no navegador:

```
http://localhost:3001/api/saude
```

Deve aparecer `{"status":"ok","banco":"conectado","categorias":6}`. Isso confirma que a API está no ar e falando com o banco.

> Todas as outras rotas exigem login (token). Elas não abrem digitando a URL no navegador: use o **Thunder Client** (extensão do VS Code) ou o PowerShell. O passo a passo está em [`docs/API.md`](docs/API.md).

Exemplo de login pelo PowerShell:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/auth/login -ContentType "application/json" -Body '{"email":"seuemail@exemplo.com","senha":"SuaSenha123"}'
$h = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri http://localhost:3001/api/categorias -Headers $h
```

### 6. Rodar o frontend

Em **outro terminal**, a partir da raiz do projeto:

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

> A tela de login já existe, mas ainda não está ligada na API. Quando for ligar, coloque o endereço da API em uma variável (`VITE_API_URL=http://localhost:3001`) em vez de escrever direto no código.

## 📡 API

Todas as rotas, os campos de cada uma, as regras e exemplos de resposta estão em **[`docs/API.md`](docs/API.md)**.

Resumo do fluxo do estoque:

1. Cadastra o **item** uma vez (ex.: "Feijão 1kg").
2. A cada doação, cria um **lote** do item (com quantidade e validade).
3. Quando sai algo, registra uma **saída** no lote.

O estoque de cada item é a soma dos seus lotes. Doação nova é sempre **lote novo**.

## 🌿 Fluxo de trabalho (Git)

A `main` é a versão estável. **Ninguém dá push direto nela**, só via Pull Request. (O GitHub gratuito não bloqueia isso sozinho em repositório privado, então vale o combinado do grupo.)

1. Atualize a `main` e crie uma branch para a sua tarefa:

```bash
git checkout main
git pull
git checkout -b feature/nome-da-tarefa
```

2. Faça as alterações e commite com mensagens curtas, dizendo o que foi feito:

```bash
git add .
git commit -m "Adiciona tela de cadastro de itens"
```

3. Suba a branch e abra um Pull Request no GitHub para o grupo revisar:

```bash
git push origin feature/nome-da-tarefa
```

> Antes do `git add .`, rode `git status` e confirme que o **`.env` e o `node_modules` não aparecem** na lista.

## 🔒 Regras de segurança do grupo

- **Nunca** commitar o `.env` (ele tem a senha do banco e a chave dos logins).
- **Nunca** colocar senhas ou chaves reais no `.env.example`, em issues ou em prints.
- O repositório não deve ter dados reais da ONG (nomes e contatos de doadores).
- Usuários de teste devem ter senha fraca **só** no banco local. No sistema real, cada pessoa troca a senha no primeiro acesso.

## 🧰 Problemas comuns

| Mensagem / sintoma | O que fazer |
|---|---|
| `JWT_SECRET não definido` | Falta a linha `JWT_SECRET` no seu `.env`. Preencha e reinicie o servidor (`Ctrl+C` e `npm run dev`) |
| `password authentication failed` | A senha do PostgreSQL na `DATABASE_URL` está errada |
| `database "ong_estoque" does not exist` | O banco não foi criado. Refaça o passo 2 |
| `relation "categorias" does not exist` | O `schema.sql` não foi executado nesse banco. Refaça o passo 2 |
| `Cannot find module` | Você está na pasta errada, ou faltou o `npm install` na pasta `backend` ou `frontend` |
| `EADDRINUSE` (porta em uso) | Já tem um servidor rodando na porta 3001. Feche o outro terminal ou mude o `PORT` no `.env` |
| `psql` não é reconhecido (Windows) | Use o pgAdmin (passo 2) |
| Erro `401` em uma rota | Falta o token de login no cabeçalho `Authorization` (veja o `docs/API.md`) |
| `Já existe um usuário com esse e-mail` | Esse admin já foi criado. Use esse e-mail no login ou crie outro |
| `fatal: Too many arguments` ao clonar | Você digitou dois comandos na mesma linha. Rode um por vez |

Não resolveu? Mande um print do terminal no grupo.

## 🗺️ Próximos passos

- [ ] Telas do frontend: login ligado na API, painel de validade, itens, registrar doação, dar saída, doadores e usuários
- [ ] Ajustes de segurança e acabamento do backend antes de ir pro ar
- [ ] Deploy (frontend + backend + banco de produção)
- [ ] Exportação de relatórios em PDF/Excel (próximo período)

## 👥 Equipe

| Frente | Responsáveis |
|---|---|
| Liderança do projeto | André e Murilo |
| Backend e deploy | André + *(a preencher)* |
| Frontend | *(a preencher)* |

> Projeto desenvolvido em grupo, para a ONG Sonho de Um Menino, nas Práticas Extensionistas.