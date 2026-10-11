# 📡 Documentação da API

API do sistema de gestão de estoque da ONG Sonho de Um Menino.

- **URL base (desenvolvimento):** `http://localhost:3001`
- **Formato:** JSON em todas as requisições e respostas
- **Autenticação:** token JWT no cabeçalho `Authorization` (exceto `/api/saude` e `/api/auth/login`)

## Índice

1. [Como usar](#como-usar)
2. [Erros](#erros)
3. [Auth (login)](#auth-login)
4. [Categorias](#categorias)
5. [Itens](#itens)
6. [Doadores](#doadores)
7. [Lotes](#lotes)
8. [Movimentações](#movimentações)
9. [Usuários (só admin)](#usuários-só-admin)
10. [Dicas para o front](#dicas-para-o-front)

---

## Como usar

### Conceitos principais

| Conceito | O que é |
|---|---|
| **Item** | O tipo de produto (ex.: "Feijão 1kg"). Não tem quantidade própria. |
| **Lote** | Cada doação recebida de um item, com validade e quantidade próprias. **O estoque mora nos lotes.** |
| **Movimentação** | Histórico de entradas e saídas de um lote. |
| **Doador** | Pessoa física, empresa ou campanha que doou. |

Fluxo normal: cadastrar o **item** uma vez → a cada doação, criar um **lote** → quando sair algo, registrar uma **movimentação de saída** no lote.

### Autenticação

1. Faça login em `POST /api/auth/login` e guarde o `token` da resposta.
2. Envie o token em todas as outras chamadas:

```
Authorization: Bearer SEU_TOKEN_AQUI
```

O token vale por 8 horas. Depois disso, a API responde `401` e o usuário precisa logar de novo.

### Exemplo com `fetch`

```js
const API = "http://localhost:3001";

// Login
const resposta = await fetch(`${API}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "ong@gmail.com", senha: "ong12345" }),
});
const { token, usuario } = await resposta.json();

// Chamada protegida
const itens = await fetch(`${API}/api/itens?busca=arroz`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
```

### Formatos

| Tipo | Formato |
|---|---|
| Datas (validade, entrada) | `"AAAA-MM-DD"` (ex.: `"2026-11-05"`) |
| Quantidades | número maior que zero, até 2 casas decimais (ex.: `10`, `2.5`) |
| `criado_em` | data/hora em ISO (ex.: `"2026-10-11T14:30:00.000Z"`) |
| Campos opcionais | podem ser omitidos ou enviados como `null` |

---

## Erros

Toda resposta de erro tem o mesmo formato, com uma mensagem pronta pra mostrar ao usuário:

```json
{ "erro": "O nome do item é obrigatório." }
```

| Código | Quando acontece |
|---|---|
| `400` | Dado inválido ou faltando |
| `401` | Sem token, token inválido/expirado ou usuário desativado |
| `403` | Rota exclusiva de administrador |
| `404` | Registro não encontrado |
| `409` | Conflito (ex.: nome duplicado) |
| `500` | Erro interno do servidor |

---

## Auth (login)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/api/saude` | público | Confere se a API e o banco estão no ar |
| `POST` | `/api/auth/login` | público | Faz login e devolve o token |
| `GET` | `/api/auth/me` | logado | Dados de quem está logado |
| `POST` | `/api/auth/trocar-senha` | logado | Troca a própria senha |

### `POST /api/auth/login`

```json
{ "email": "ong@gmail.com", "senha": "ong12345" }
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": { "id": 1, "nome": "ONG", "email": "ong@gmail.com", "perfil": "admin" }
}
```

`perfil` é `"admin"` ou `"voluntario"`. Erro `401`: `"E-mail ou senha incorretos."`

### `GET /api/auth/me`

Resposta `200`: `{ "usuario": { "id": 1, "nome": "ONG", "email": "ong@gmail.com", "perfil": "admin" } }`

Serve para validar a sessão quando o app abre (se der `401`, mandar pro login).

### `POST /api/auth/trocar-senha`

```json
{ "senha_atual": "ong12345", "senha_nova": "novaSenha123" }
```

Resposta `200`: `{ "mensagem": "Senha alterada." }`. A senha nova precisa ter de 8 a 72 caracteres.

---

## Categorias

Todas exigem login.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/categorias` | Lista todas (ordem alfabética) |
| `POST` | `/api/categorias` | Cria uma categoria |

`GET` responde: `[{ "id": 1, "nome": "Alimentos" }, ...]`

`POST` recebe `{ "nome": "Medicamentos" }` e responde `201` com `{ "id": 7, "nome": "Medicamentos" }`. Nome repetido dá `409`.

Categorias iniciais: Alimentos, Higiene e limpeza, Roupas e calçados, Brinquedos, Material escolar, Outros.

---

## Itens

Todas exigem login.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/itens` | Lista itens **ativos** |
| `GET` | `/api/itens/:id` | Um item |
| `POST` | `/api/itens` | Cria um item |
| `PUT` | `/api/itens/:id` | Edita um item |
| `DELETE` | `/api/itens/:id` | Desativa o item (não apaga, preserva o histórico) |

### Objeto item

```json
{
  "id": 1,
  "nome": "Feijao 1kg",
  "unidade": "pacote",
  "controla_validade": true,
  "ativo": true,
  "categoria_id": 1,
  "categoria": "Alimentos",
  "estoque_total": 7
}
```

`estoque_total` é a soma dos lotes que ainda têm quantidade.

### `GET /api/itens`

Filtros opcionais (podem ser combinados): `?busca=arroz` (parte do nome) e `?categoria_id=1`.

### `POST /api/itens` e `PUT /api/itens/:id`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `nome` | sim | Até 120 caracteres |
| `categoria_id` | não | Id de uma categoria existente |
| `unidade` | não | Até 20 caracteres. Padrão `"un"` (ex.: `kg`, `pacote`, `l`) |
| `controla_validade` | não | `true` ou `false`. Padrão `true`. Use `false` para roupas, brinquedos etc. |

No `PUT`, envie todos os campos. `POST` responde `201` com o item criado. Erros: `409` se já existir item com o mesmo nome na mesma categoria, `400` se a categoria não existir.

`DELETE` responde `{ "mensagem": "Item desativado." }`.

---

## Doadores

Todas exigem login.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/doadores` | Lista doadores |
| `GET` | `/api/doadores/:id` | Um doador |
| `POST` | `/api/doadores` | Cria um doador |
| `PUT` | `/api/doadores/:id` | Edita um doador |
| `DELETE` | `/api/doadores/:id` | Apaga (só se não tiver lotes) |

### Objeto doador

```json
{ "id": 1, "nome": "Mercado Central", "tipo": "empresa", "contato": "(32) 99999-0000" }
```

### `GET /api/doadores`

Filtros opcionais: `?busca=mercado` e `?tipo=empresa`.

### `POST` e `PUT`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `nome` | sim | Até 160 caracteres |
| `tipo` | não | `"pessoa_fisica"` (padrão), `"empresa"` ou `"campanha"` |
| `contato` | não | Até 160 caracteres (telefone, e-mail...) |

No `PUT`, envie todos os campos. `DELETE` em doador que já tem lotes responde `409`: `"Este doador tem lotes vinculados e não pode ser apagado."`

---

## Lotes

Todas exigem login. **É aqui que fica o estoque e o controle de validade.**

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/lotes` | Lista lotes com estoque, pela validade mais próxima |
| `GET` | `/api/lotes/resumo` | Contagem por status (cards do painel) |
| `GET` | `/api/lotes/:id` | Um lote com o histórico de movimentações |
| `POST` | `/api/lotes` | Registra uma doação |
| `PUT` | `/api/lotes/:id` | Corrige doador, validade ou observação |

Não existe `DELETE` de lote: para baixar um lote, registre uma saída (ex.: destino "descarte").

### Objeto lote

```json
{
  "id": 1,
  "item_id": 1,
  "item": "Feijao 1kg",
  "unidade": "pacote",
  "categoria": "Alimentos",
  "doador_id": 1,
  "doador": "Mercado Central",
  "quantidade_inicial": 10,
  "quantidade_atual": 7,
  "data_validade": "2026-11-05",
  "data_entrada": "2026-10-11",
  "observacao": null,
  "dias_para_vencer": 25,
  "status": "vencendo"
}
```

`data_validade` e `dias_para_vencer` são `null` quando o item não controla validade.

### Status de validade

| `status` | Significado | Sugestão de cor |
|---|---|---|
| `vencido` | Validade já passou | 🔴 vermelho |
| `vencendo` | Vence dentro da janela de alerta (padrão 30 dias, inclui hoje) | 🟡 amarelo |
| `ok` | Vence depois da janela | 🟢 verde |
| `sem_validade` | Item sem controle de validade | ⚪ neutro |

### `GET /api/lotes`

Por padrão mostra só lotes com estoque (`quantidade_atual > 0`). Filtros opcionais, combináveis:

| Parâmetro | Descrição |
|---|---|
| `item_id`, `doador_id`, `categoria_id` | Filtra por id |
| `busca` | Parte do nome do item |
| `status` | `vencido`, `vencendo`, `ok` ou `sem_validade` |
| `dias` | Tamanho da janela de "vencendo", de 0 a 3650 (padrão `30`) |
| `incluir_zerados` | `true` para incluir lotes já esgotados |

Exemplo: `/api/lotes?status=vencendo&dias=15` traz os que vencem em até 15 dias.

### `GET /api/lotes/resumo?dias=30`

Resposta `200` (só conta lotes com estoque):

```json
{
  "dias_alerta": 30,
  "vencidos": 0,
  "vencendo": 2,
  "ok": 5,
  "sem_validade": 3,
  "total_lotes": 10
}
```

### `GET /api/lotes/:id`

Devolve o lote (mesmo formato acima, com `status` calculado na janela padrão de 30 dias) mais o histórico:

```json
{
  "id": 1,
  "...": "...",
  "movimentacoes": [
    {
      "id": 2, "tipo": "saida", "quantidade": 3,
      "destino": "Cesta basica", "observacao": null,
      "criado_em": "2026-10-11T15:00:00.000Z", "usuario": "ONG"
    },
    {
      "id": 1, "tipo": "entrada", "quantidade": 10,
      "destino": null, "observacao": "Entrada inicial do lote",
      "criado_em": "2026-10-11T14:30:00.000Z", "usuario": "ONG"
    }
  ]
}
```

### `POST /api/lotes` (registrar doação)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `item_id` | sim | Item ativo existente |
| `quantidade` | sim | Maior que zero, até 2 casas decimais |
| `data_validade` | **sim, se o item controla validade** | `"AAAA-MM-DD"`. Se o item não controla validade, é ignorada |
| `doador_id` | não | Doador existente |
| `data_entrada` | não | `"AAAA-MM-DD"`. Padrão: hoje |
| `observacao` | não | Texto livre |

Responde `201` com o lote criado. A movimentação de entrada é registrada automaticamente.

### `PUT /api/lotes/:id`

Corrige `doador_id`, `data_validade` e `observacao`. ⚠️ **Campo omitido é apagado** (vira `null`), então envie os três sempre (a validade é obrigatória se o item controla validade). As quantidades **não** mudam aqui, use as movimentações.

---

## Movimentações

Todas exigem login.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/movimentacoes` | Registra uma saída (ou estorno) em um lote |
| `GET` | `/api/movimentacoes` | Histórico, mais recentes primeiro |

### `POST /api/movimentacoes`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `lote_id` | sim | Lote existente |
| `tipo` | sim | `"saida"` ou `"entrada"` |
| `quantidade` | sim | Maior que zero, até 2 casas decimais |
| `destino` | não | Para saídas: quem/onde recebeu (até 160 caracteres) |
| `observacao` | não | Texto livre |

Resposta `201`:

```json
{
  "id": 2,
  "lote_id": 1,
  "tipo": "saida",
  "quantidade": 3,
  "destino": "Cesta basica",
  "observacao": null,
  "quantidade_atual_do_lote": 7
}
```

Regras:

- **`saida`** desconta do lote e **não pode passar do estoque**. Erro `400`: `"Quantidade maior que o estoque do lote (disponível: 7)."`
- **`entrada`** serve só para **estornar** uma saída lançada errado: nunca passa da quantidade inicial do lote. **Doação nova não é entrada, é um novo lote** (`POST /api/lotes`).
- O usuário logado é registrado automaticamente em cada movimentação.

### `GET /api/movimentacoes`

Filtros opcionais: `lote_id`, `item_id`, `tipo` (`entrada` ou `saida`), `data_inicio` e `data_fim` (`AAAA-MM-DD`), `limite` (padrão 100, máximo 500).

```json
[
  {
    "id": 2,
    "lote_id": 1,
    "item_id": 1,
    "item": "Feijao 1kg",
    "unidade": "pacote",
    "tipo": "saida",
    "quantidade": 3,
    "destino": "Cesta basica",
    "observacao": null,
    "criado_em": "2026-10-11T15:00:00.000Z",
    "usuario": "ONG"
  }
]
```

---

## Usuários (só admin)

Exigem login **e** perfil `admin`. Voluntário recebe `403`.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/usuarios` | Lista usuários |
| `POST` | `/api/usuarios` | Cria um usuário |
| `PUT` | `/api/usuarios/:id` | Edita (inclusive desativa) |

Não existe `DELETE`: para desligar alguém, envie `"ativo": false`. A senha nunca é devolvida.

### Objeto usuário

```json
{
  "id": 2, "nome": "Maria", "email": "maria@exemplo.com",
  "perfil": "voluntario", "ativo": true, "criado_em": "2026-10-11T14:00:00.000Z"
}
```

### `POST /api/usuarios`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `nome` | sim | Até 120 caracteres |
| `email` | sim | E-mail válido, único |
| `senha` | sim | De 8 a 72 caracteres |
| `perfil` | não | `"voluntario"` (padrão) ou `"admin"` |

Responde `201`. E-mail repetido dá `409`.

### `PUT /api/usuarios/:id`

Envie `nome`, `perfil` e `ativo` (se omitido, vira `true`). `senha` é opcional: só vai se quiser redefinir a senha da pessoa. Um admin não pode desativar nem rebaixar o próprio usuário (`400`).

---

## Dicas para o front

- **Endereço da API em variável de ambiente.** No Vite, crie `frontend/.env` com `VITE_API_URL=http://localhost:3001` e use `import.meta.env.VITE_API_URL`. Assim, no deploy, só troca o valor.
- **Trate o `401` em um lugar só.** Se qualquer chamada voltar `401`, apague o token e mande o usuário pro login.
- **Mostre a mensagem do campo `erro`** direto na tela: ela já vem em português e pronta pro usuário.
- **Painel inicial:** use `GET /api/lotes/resumo` para os cards de vencidos/vencendo e `GET /api/lotes?status=vencendo` (e `status=vencido`) para as listas.
- **Telas de admin:** esconda o menu "Usuários" para `perfil !== "admin"` (o `perfil` vem no login e no `/api/auth/me`). A API já bloqueia de qualquer jeito.
- **Teste rápido sem o front:** extensão **Thunder Client** do VS Code, ou o PowerShell (`Invoke-RestMethod`), mandando o cabeçalho `Authorization`.