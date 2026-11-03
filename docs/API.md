# 📡 Documentação da API

API do sistema de gestão de estoque da ONG Sonho de Um Menino.

- **URL base (desenvolvimento):** `http://localhost:3001`
- **Formato:** JSON em todas as requisições e respostas
- **Autenticação:** token JWT no cabeçalho `Authorization` (exceto `/api/saude` e `/api/auth/login`)

## Índice

1. [Como usar](#como-usar)
2. [Permissões](#permissões)
3. [Erros](#erros)
4. [Auth (login)](#auth-login)
5. [Categorias](#categorias)
6. [Itens](#itens)
7. [Doadores](#doadores)
8. [Lotes](#lotes)
9. [Movimentações](#movimentações)
10. [Usuários (só admin)](#usuários-só-admin)
11. [Dicas para o front](#dicas-para-o-front)

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
  body: JSON.stringify({ email: "seuemail@exemplo.com", senha: "SuaSenha123" }),
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

## Permissões

O perfil **`admin`** sempre pode tudo. Os demais usuários (`voluntario`) recebem **permissões** marcadas pelo administrador, e cada uma libera um grupo de ações. O servidor recusa com `403` o que não for permitido (esconder no menu não basta).

| Permissão | O que libera |
|---|---|
| `registrar_doacao` | `POST /api/lotes` e `PUT /api/lotes/:id` |
| `dar_saida` | `POST /api/movimentacoes` |
| `gerenciar_itens` | `POST`, `PUT` e `DELETE` em `/api/itens` e `POST /api/categorias` |
| `gerenciar_doadores` | `POST`, `PUT`, `DELETE` e `/anonimizar` em `/api/doadores`, **e ver o contato dos doadores** |
| `ver_historico` | `GET /api/movimentacoes` e a lista de movimentações dentro de `GET /api/lotes/:id` |

**Todo usuário logado** pode consultar: Painel (`/api/lotes/resumo`), `GET` de lotes, itens, categorias e doadores (sem o contato).

**Só admin:** tudo de `/api/usuarios`.

As permissões do usuário logado vêm no login e em `GET /api/auth/me` (`usuario.permissoes`). Use isso para esconder botões e telas.

### Primeiro acesso (senha temporária)

Todo usuário criado pelo admin, e todo usuário que teve a senha redefinida, tem `deve_trocar_senha: true`. Enquanto for `true`, **todas as rotas respondem `403`** com `{ "erro": "...", "codigo": "TROCAR_SENHA" }`, exceto `GET /api/auth/me` e `POST /api/auth/trocar-senha`. Fluxo no front: depois do login, se `usuario.deve_trocar_senha` for `true`, abrir só a tela de trocar senha; depois da troca, liberar o resto.

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
| `403` | Rota exclusiva de administrador, ação sem permissão ou troca de senha pendente (`"codigo": "TROCAR_SENHA"`) |
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
{ "email": "seuemail@exemplo.com", "senha": "SuaSenha123" }
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1, "nome": "Seu Nome", "email": "seuemail@exemplo.com", "perfil": "admin",
    "permissoes": ["registrar_doacao", "dar_saida", "gerenciar_itens", "gerenciar_doadores", "ver_historico"],
    "deve_trocar_senha": false
  }
}
```

`perfil` é `"admin"` ou `"voluntario"`. Se `deve_trocar_senha` for `true`, a pessoa precisa trocar a senha antes de usar o sistema (veja [Primeiro acesso](#primeiro-acesso-senha-temporária)). Erro `401`: `"E-mail ou senha incorretos."`

### `GET /api/auth/me`

Resposta `200`: `{ "usuario": { ... } }`, com os mesmos campos do login (inclusive `permissoes` e `deve_trocar_senha`).

Serve para validar a sessão quando o app abre (se der `401`, mandar pro login).

### `POST /api/auth/trocar-senha`

```json
{ "senha_atual": "SuaSenha123", "senha_nova": "novaSenha123" }
```

Resposta `200`: `{ "mensagem": "Senha alterada." }`. A senha nova precisa ter de 8 a 72 caracteres e ser **diferente da atual**. Depois da troca, `deve_trocar_senha` volta a `false`. Esta rota funciona mesmo com a senha temporária pendente.

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

Quem não tem a permissão `gerenciar_doadores` recebe `"contato": null` (só o necessário, LGPD). Criar, editar, apagar e anonimizar exigem `gerenciar_doadores`.

### `POST` e `PUT`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `nome` | sim | Até 160 caracteres |
| `tipo` | não | `"pessoa_fisica"` (padrão), `"empresa"` ou `"campanha"` |
| `contato` | não | Até 160 caracteres (telefone, e-mail...) |

No `PUT`, envie todos os campos. `DELETE` em doador que já tem lotes responde `409`: `"Este doador tem lotes vinculados e não pode ser apagado."`

### `POST /api/doadores/:id/anonimizar`

Para pedidos de eliminação (LGPD) de quem já tem doações: troca o nome por `"Doador anonimizado"` e apaga o contato. As doações continuam ligadas a ele. Responde com o doador; já anonimizado dá `409`. **Não dá para desfazer.** Textos digitados em observações e destinos não são alterados.

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

Devolve o lote (mesmo formato acima, com `status` calculado na janela padrão de 30 dias) mais o histórico. A lista `movimentacoes` só vem preenchida para quem tem a permissão `ver_historico`; para os demais vem vazia:

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

Exige a permissão `ver_historico` (sem ela, `403`). O Painel só deve chamar esta rota para quem tem a permissão.

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

Exigem login **e** perfil `admin`. Quem não é admin recebe `403`.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/usuarios/permissoes` | Lista as permissões e os modelos (para montar as caixinhas) |
| `GET` | `/api/usuarios` | Lista usuários |
| `POST` | `/api/usuarios` | Cria um usuário |
| `PUT` | `/api/usuarios/:id` | Edita nome, perfil, ativo e permissões (inclusive desativa) |
| `POST` | `/api/usuarios/:id/redefinir-senha` | Gera uma nova senha temporária |
| `POST` | `/api/usuarios/:id/anonimizar` | Remove os dados pessoais (LGPD) |

Não existe `DELETE`: para desligar alguém, envie `"ativo": false`. A senha nunca é devolvida.

### Objeto usuário

```json
{
  "id": 2, "nome": "Maria", "email": "maria@exemplo.com",
  "perfil": "voluntario", "ativo": true,
  "permissoes": ["registrar_doacao", "dar_saida"],
  "deve_trocar_senha": true, "anonimizado_em": null,
  "criado_em": "2026-10-11T14:00:00.000Z"
}
```

### `GET /api/usuarios/permissoes`

```json
{
  "permissoes": [
    { "chave": "registrar_doacao", "rotulo": "Registrar doação" },
    { "chave": "dar_saida", "rotulo": "Dar saída" }
  ],
  "modelos": {
    "administrador": ["registrar_doacao", "dar_saida", "gerenciar_itens", "gerenciar_doadores", "ver_historico"],
    "voluntario": ["registrar_doacao", "dar_saida"],
    "consulta": []
  }
}
```

Use `permissoes` para desenhar as caixinhas e `modelos` para os botões de modelo pronto ("Voluntário", "Somente consulta").

### `POST /api/usuarios`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `nome` | sim | Até 120 caracteres |
| `email` | sim | E-mail válido, único (guardado em minúsculas) |
| `perfil` | não | `"voluntario"` (padrão) ou `"admin"` |
| `permissoes` | não | Lista de chaves. Omitida = modelo "voluntário". Ignorada para `admin` (recebe todas) |
| `senha` | não | De 8 a 72 caracteres. **Omitida = o sistema gera uma senha temporária** |

Responde `201` com o usuário. Quando a senha foi gerada, vem também `"senha_temporaria"`: **aparece só nesta resposta**, então mostre na tela para o admin copiar. O usuário novo sempre começa com `deve_trocar_senha: true`. E-mail repetido dá `409`; permissão inexistente dá `400`.

### `PUT /api/usuarios/:id`

Envie `nome`, `perfil` e `ativo` (se omitido, vira `true`). `permissoes` é opcional: omitida, mantém as atuais. A senha **não** muda aqui.

Regras (`400`): o admin não pode desativar nem rebaixar o próprio usuário; sempre precisa sobrar pelo menos um admin ativo; usuário anonimizado não pode ser editado.

### `POST /api/usuarios/:id/redefinir-senha`

Corpo opcional: `{ "senha": "..." }`. Sem `senha`, gera uma temporária.

```json
{ "mensagem": "Senha redefinida. A pessoa deverá trocá-la no próximo acesso.", "senha_temporaria": "kT7mQx2NpR9s" }
```

A pessoa precisa trocar a senha no próximo acesso. Não vale para o próprio admin (`400`: use "Minha conta") nem para usuário anonimizado.

### `POST /api/usuarios/:id/anonimizar`

Troca o nome por `"Usuário anonimizado"`, o e-mail por um endereço inválido, apaga a senha, tira as permissões e desativa. O histórico continua, mas "quem fez" passa a aparecer como "Usuário anonimizado". **Não dá para desfazer.** Erros: o próprio usuário (`400`), o último admin ativo (`400`), já anonimizado (`409`).

---

## Dicas para o front

- **Endereço da API em variável de ambiente.** No Vite, crie `frontend/.env` com `VITE_API_URL=http://localhost:3001` e use `import.meta.env.VITE_API_URL`. Assim, no deploy, só troca o valor.
- **Trate o `401` em um lugar só.** Se qualquer chamada voltar `401`, apague o token e mande o usuário pro login.
- **Mostre a mensagem do campo `erro`** direto na tela: ela já vem em português e pronta pro usuário.
- **Painel inicial:** use `GET /api/lotes/resumo` para os cards de vencidos/vencendo e `GET /api/lotes?status=vencendo` (e `status=vencido`) para as listas.
- **Telas e botões por permissão:** use `usuario.permissoes` (e `perfil === "admin"`, que pode tudo) para esconder menus e botões. A API já bloqueia de qualquer jeito.
- **Primeiro acesso:** se `usuario.deve_trocar_senha` for `true`, mostre só a tela de trocar senha. Qualquer outra chamada volta `403` com `"codigo": "TROCAR_SENHA"`.
- **Senha temporária:** ao criar usuário ou redefinir senha, a API devolve `senha_temporaria` uma única vez. Mostre com um botão de copiar e avise que ela não será exibida de novo.
- **Teste rápido sem o front:** extensão **Thunder Client** do VS Code, ou o PowerShell (`Invoke-RestMethod`), mandando o cabeçalho `Authorization`.