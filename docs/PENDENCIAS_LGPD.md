# ✅ O que falta preencher (LGPD)

Lista para o grupo seguir, sem precisar entender de programação. Quase tudo está **num arquivo só**; o resto são 3 ajustes pequenos e algumas decisões da ONG.

> Para achar tudo que ainda está em branco: no VS Code, aperte `Ctrl+Shift+F` e procure por `PREENCHER`.

---

## 1. O arquivo principal: `frontend/src/config/organizacao.js`

É aqui que ficam os dados da ONG. A **Política de Privacidade** e os **Termos de Uso** leem tudo daqui, então preenchendo uma vez, as duas páginas se atualizam sozinhas. Basta trocar o texto entre aspas (apague o `[PREENCHER: ...]` inteiro e escreva o valor).

| Campo | O que colocar | Quem sabe | Exemplo |
|---|---|---|---|
| `razaoSocial` | Nome oficial da ONG, como está no cartão do CNPJ | Presidência ou contador da ONG | `"Associação Sonho de um Menino"` |
| `cnpj` | CNPJ da ONG. Dica: costuma aparecer na bio do Instagram deles (é a chave PIX). Confirme com a ONG | Presidência | `"00.000.000/0001-00"` |
| `cidadeUf` | Cidade e estado da sede da ONG | Presidência | `"Juiz de Fora/MG"` |
| `emailPrivacidade` | E-mail para as pessoas pedirem coisas sobre seus dados (ver, corrigir, apagar). **Precisa ser uma caixa que alguém realmente lê.** Pedidos de acesso têm resposta em até 15 dias | ONG | `"contato@suaong.org.br"` |
| `responsavelDados` | Nome de quem, **dentro da ONG**, responde pelos dados | ONG | `"Maria Silva (coordenação)"` |
| `prazoRetencao` | Por quanto tempo o histórico e os dados de ex-voluntários ficam guardados. **Decidir com a ONG, de preferência com o contador ou advogado** | ONG + jurídico | `"5 anos a partir de cada registro, salvo exigência legal de prazo maior"` (sugestão, confirmar) |
| `hospedagem` | Onde o sistema fica **de fato** hospedado. Só preencher depois do deploy | Quem fez o deploy | `"Vercel (site) e Oracle Cloud (servidor e banco de dados)"` |
| `foro` | Comarca que resolveria uma eventual disputa | ONG + jurídico | `"Comarca de Juiz de Fora/MG"` |
| `ultimaAtualizacao` | Data em que os textos foram revisados pela última vez. Atualizar toda vez que mudar algum texto | Quem revisou | `"12/11/2026"` |

O campo `nome` já está certo (`Sonho de um Menino`).

**Como saber que acabou:** quando não sobrar nenhum `[PREENCHER` no arquivo, o aviso amarelo de "Rascunho" some das páginas `/privacidade` e `/termos`. Atenção: o aviso sumir **não significa que o texto foi revisado por um advogado**. Isso é outra etapa (item 4).

---

## 2. Fora desse arquivo (3 ajustes pequenos)

### a) `docs/LGPD.md`, linha 5
Trocar `Última revisão: _(preencher a data)_` pela data real.

### b) `frontend/src/pages/PoliticaPrivacidadePage.jsx`: frases que precisam ser **verdade** no dia de publicar
A Política afirma algumas coisas sobre o sistema. Não pode afirmar o que não é verdade. Antes de publicar, confira cada uma e, se não for verdade, **apague a frase**:

| Frase na política | Só é verdade se... | Onde |
|---|---|---|
| "conexão segura" | o servidor estiver com **HTTPS** | seção 7 (Segurança) |
| *(tirada)* "cópias de segurança" | A frase foi removida da política. **Se um backup do banco passar a existir**, pode acrescentar de volta: "...e cópias de segurança" | seção 7 (Segurança) |
| "Alguns servidores podem ficar fora do Brasil" | a hospedagem escolhida tiver servidor fora do Brasil. Se tudo ficar no Brasil, pode tirar a frase | seção 4 (Com quem compartilhamos) |

(Essas três coisas fazem parte do deploy e do pacote de segurança.)

### c) `frontend/index.html` (não é preenchimento, mas ficou pendente)
Trocar três coisas:
- `<html lang="en">` por `<html lang="pt-BR">`
- `<title>...</title>` por `<title>Sonho de um Menino · Controle de estoque</title>`
- dentro do `<head>`, acrescentar `<meta name="robots" content="noindex, nofollow" />`

E, no terminal do `frontend`, instalar as fontes locais (se ainda não fez): `npm install @fontsource/baloo-2 @fontsource/inter`

---

## 3. Decisões e tarefas da ONG (não são código)

- [ ] Criar ou escolher o **e-mail do canal de privacidade** (item `emailPrivacidade`) e combinar quem responde
- [ ] Escolher a **pessoa responsável pelos dados** na ONG
- [ ] Definir o **prazo de guarda** dos dados
- [ ] Decidir **quem será administrador** do sistema
- [ ] Escolher a **região da hospedagem** (servidor no Brasil evita a questão de transferência internacional de dados)
- [ ] Definir **quem é o dono do código** e como ele é licenciado para a ONG (grupo, universidade e ONG) e, se possível, registrar por escrito
- [ ] Incluir no **termo de adesão do voluntariado** uma cláusula de confidencialidade e proteção de dados
- [ ] Combinar o **canal de suporte**: quem cuida do servidor e do banco, e até quando o grupo ajuda

## 4. Antes de colocar dados reais

- [ ] **Revisão dos textos** (`/privacidade` e `/termos`) por advogado ou pela assessoria jurídica da universidade
- [ ] Trocar a **senha temporária** do administrador
- [ ] Usar só **dados fictícios** em testes e em prints enviados em grupos
- [ ] Conferir que **nenhum dado real** foi parar no GitHub
- [ ] Lembrar a equipe de **não digitar nomes, endereços ou dados de pessoas atendidas** (principalmente crianças) nos campos de texto livre

---

Mais detalhes sobre o porquê de cada item estão em [`docs/LGPD.md`](LGPD.md).