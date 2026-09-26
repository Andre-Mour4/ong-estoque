# 📦 Sistema de Gestão de Estoque — ONG Sonho de Um Menino

Sistema web para organizar as doações recebidas pela ONG **Sonho de Um Menino**, com controle por data de validade, alertas de vencimento e busca/filtro rápido. Projeto de extensão (Práticas Extensionistas), desenvolvido em grupo como continuação do [chatbot de WhatsApp](#) já em operação para a mesma ONG.

## ✨ Funcionalidades (MVP)

- 📋 Cadastro de itens, lotes de doação e doadores
- ⏰ Painel de alertas para itens perto de vencer (por faixa de dias)
- 🔍 Busca e filtro por categoria, validade e doador
- 🔄 Registro de entradas (doações) e saídas (distribuição) com histórico

> Exportação de relatórios em PDF/Excel fica para uma próxima etapa do projeto.

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL |
| Deploy (frontend) | Vercel |
| Deploy (backend) | Oracle Cloud Free Tier *ou* Render (a definir) |

## 📁 Estrutura do projeto

```
ong-estoque/
├── backend/          # API REST (Node + Express)
├── frontend/         # Aplicação React
└── README.md
```

## 🚀 Como rodar localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18 ou superior)
- [PostgreSQL](https://www.postgresql.org/) instalado e rodando
- Git

### 1. Clonar o repositório

```bash
git clone https://github.com/SEU-USUARIO/ong-estoque.git
cd ong-estoque
```

### 2. Configurar o backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o arquivo `.env` com os dados do seu banco local:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/ong_estoque
PORT=3001
```

Rodar o servidor:

```bash
npm run dev
```

### 3. Configurar o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O frontend deve subir em `http://localhost:5173` (ou porta indicada no terminal) e o backend em `http://localhost:3001`.

## 🌿 Fluxo de trabalho (Git)

- A branch `main` está protegida — ninguém commita direto nela.
- Para cada tarefa, crie uma branch a partir da `main`:

```bash
git checkout main
git pull
git checkout -b feature/nome-da-tarefa
```

- Suba suas alterações e abra um Pull Request para revisão antes do merge:

```bash
git push origin feature/nome-da-tarefa
```

## 👥 Equipe

| Frente | Responsáveis |
|---|---|
| Backend + Deploy | *(a preencher)* |
| Frontend | *(a preencher)* |

## 📄 Status

🚧 Em desenvolvimento — planejamento inicial concluído, MVP em construção.
