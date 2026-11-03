# 🛡️ LGPD e riscos jurídicos do sistema

> ⚠️ **Aviso:** este documento é uma análise técnica feita pelo grupo de desenvolvimento. **Não é parecer jurídico.** Os pontos marcados com ⚖️ devem ser revisados por um advogado ou pela assessoria jurídica da universidade antes de o sistema ser usado com dados reais.

Última revisão: _(preencher a data)_

## 1. Resumo

O sistema é **interno** (só entra quem tem login), não tem venda, pagamento, publicidade nem rastreamento. O risco principal é a **LGPD**, porque ele guarda dados pessoais de **voluntários/colaboradores** (login) e de **doadores** (nome e contato). O segundo risco é o **campo de texto livre**: alguém pode digitar nome ou endereço de pessoas atendidas (inclusive crianças) onde não deveria.

Por isso o sistema coleta só o necessário, não usa cookies nem scripts de terceiros, e pede que ninguém registre dados de pessoas atendidas.

## 2. Quem é quem

| Papel | Quem |
|---|---|
| **Controladora** (decide para que os dados servem) | A ONG |
| **Operadores** (tratam dados em nome da ONG) | Hospedagem (Vercel, Render ou Oracle) e, se o grupo administrar o servidor e o banco, o próprio grupo ⚖️ |
| **Titulares** (donos dos dados) | Doadores (pessoas físicas) e voluntários/colaboradores que usam o sistema |

**Porte:** a Resolução CD/ANPD nº 2/2022 inclui entre os "agentes de tratamento de pequeno porte" as pessoas jurídicas de direito privado, inclusive sem fins lucrativos. Para esses agentes, não é obrigatório indicar um **encarregado (DPO)**, mas é obrigatório **disponibilizar um canal de comunicação** com os titulares. Indicar um encarregado é considerado boa prática. Isso **não vale** para quem faz tratamento de alto risco ⚖️ confirmar o enquadramento da ONG.

## 3. Mapa dos dados

| Dado | Onde fica | Para quê | Base legal sugerida ⚖️ | Quem acessa |
|---|---|---|---|---|
| Nome, e-mail e perfil de voluntários/colaboradores | tabela `usuarios` | Identificar quem usa e controlar acesso | Legítimo interesse da ONG / relação de voluntariado | Administradores |
| Senha | `usuarios.senha_hash` | Entrar no sistema | Segurança | Ninguém lê (guardada só como hash) |
| Quem fez cada entrada/saída e quando | `movimentacoes` | Auditoria e prestação de contas | Legítimo interesse; exercício regular de direitos | Usuários logados |
| Doadores: nome, tipo e contato | `doadores` | Registrar de onde veio cada doação e agradecer | Legítimo interesse; consentimento para contato, quando houver ⚖️ | Usuários logados |
| Destino e observações (texto livre) | `movimentacoes`, `lotes` | Controle do estoque | — | Usuários logados |
| IP e registros de acesso | Hospedagem | Segurança e funcionamento | Legítimo interesse | Provedor de hospedagem |
| Token de login | Navegador (localStorage) | Manter a sessão | Estritamente necessário | Próprio usuário |

**Retenção (a definir ⚖️):** hoje nada é apagado automaticamente. Sugestão a validar: manter o histórico de estoque pelo tempo necessário à prestação de contas e eliminar ou anonimizar os dados pessoais de ex-voluntários e de doadores que pedirem.

## 4. O que NÃO deve ser registrado no sistema

- Nome, endereço, telefone, documentos ou fotos de **pessoas atendidas**, principalmente **crianças e adolescentes** (LGPD, art. 14). Use destinos genéricos, como "Entrega a família".
- **Dados sensíveis** de qualquer pessoa (saúde, religião, origem, etc.).
- **CPF, RG ou endereço** de doadores. O campo de contato é só para telefone ou e-mail.
- Valores, contratos ou informações comerciais sigilosas de empresas doadoras.

Se um dia a ONG quiser cadastrar beneficiários, é **outro nível de risco** (dados de crianças, possível tratamento de alto risco): reavaliar tudo antes.

## 5. Checklist

### ✅ Já atendido pelo sistema
- Coleta mínima: sem CPF, endereço ou documentos
- Senhas com hash (bcrypt), login com validade, perfis admin/voluntário, sem cadastro aberto
- Registro de quem fez cada entrada e saída
- Sem cookies de rastreamento, sem analytics, sem pixel, sem publicidade
- Fontes hospedadas no próprio sistema (nada vai para o Google ao abrir a página)
- Política de Privacidade e Termos de Uso no sistema (modelos a preencher e revisar)
- Avisos nos campos de texto livre para não digitar dados pessoais
- Consultas ao banco com parâmetros; `.env` fora do Git

### ⏳ A fazer antes de usar com dados reais
- [ ] **HTTPS** no backend, **limite de tentativas no login**, **CORS restrito**, `helmet`, chave JWT nova, usuário próprio no banco e `NODE_ENV=production` (itens da revisão de segurança)
- [ ] **Backup** do banco, guardado com acesso restrito
- [ ] Preencher `frontend/src/config/organizacao.js` (razão social, CNPJ, e-mail do canal de privacidade, responsável) e **revisar os textos legais** ⚖️
- [ ] Definir o **prazo de retenção** e o procedimento para eliminar/anonimizar dados
- [ ] **Anonimizar doador e usuário** (hoje doador com lotes não pode ser apagado e usuário só é desativado, o que não atende bem um pedido de eliminação)
- [ ] **Termo de adesão do voluntariado** com cláusula de confidencialidade e proteção de dados (a Lei 9.608/98 prevê o termo de adesão) ⚖️
- [ ] Trocar a **senha temporária** do admin
- [ ] Usar **dados fictícios** em testes e em prints
- [ ] Escolher a **região da hospedagem**: servidores fora do Brasil implicam transferência internacional de dados (LGPD, art. 33) ⚖️

## 6. Direitos dos titulares (LGPD, art. 18)

A pessoa pode pedir: confirmação do tratamento, acesso, correção, anonimização ou eliminação, portabilidade, informação sobre compartilhamento e revogação de consentimento.

**Como atender:** o pedido chega no e-mail do canal de privacidade (definido em `organizacao.js`). Um administrador consulta o doador ou usuário no sistema, corrige o que for pedido e responde. Pedidos de acesso têm resposta em até 15 dias (LGPD, art. 19). Para eliminação, usar a anonimização, quando existir.

## 7. Se acontecer um incidente de segurança

Exemplos: senha vazada, acesso indevido, banco exposto, perda de dados.

1. **Conter:** trocar o `JWT_SECRET` (desloga todo mundo), trocar a senha do banco, desativar usuários suspeitos.
2. **Registrar:** data, o que houve, quais dados foram afetados. O registro de incidentes deve ser guardado por no mínimo 5 anos.
3. **Avaliar** se pode causar risco ou dano relevante às pessoas.
4. **Comunicar** a ANPD e as pessoas afetadas, se houver risco ou dano relevante. O prazo é de **3 dias úteis** a partir do momento em que se sabe que o incidente afetou dados pessoais, e é **contado em dobro** para agentes de pequeno porte (Resolução CD/ANPD nº 15/2024; a dobra exige declaração de enquadramento ⚖️).
5. **Corrigir** a causa.

## 8. Outros riscos jurídicos

- **Autoria e licença do código** ⚖️: definir quem é o titular (grupo, universidade, ONG) e formalizar, por exemplo, uma cessão ou licença de uso para a ONG, respeitando as regras de extensão da universidade. As bibliotecas usadas têm licenças permissivas (MIT/BSD).
- **Responsabilidade do grupo** ⚖️: um documento simples entre a ONG e o grupo deixando claro que o sistema é entregue "no estado em que se encontra", sem garantia de funcionamento ininterrupto, quem administra servidor e banco, e até quando o grupo dá suporte.
- **Validade e vigilância sanitária:** os alertas são **apoio**, não substituem a conferência física dos produtos nem as regras sanitárias. A responsabilidade pela doação de alimentos continua com a ONG ⚖️. Os Termos de Uso dizem isso.
- **Imagens e arte:** o fundo foi gerado por IA. Guarde o prompt, a data, a ferramenta e os termos de uso dela. Não há regra brasileira específica sobre direito autoral de obras geradas por IA: o risco é baixo para um fundo decorativo, mas o resultado pode não ser protegível ⚖️. O nome e o logo da ONG só com autorização dela. **Não usar fotos de crianças.**
- **Fontes e bibliotecas:** Baloo 2 e Inter usam a licença SIL OFL (uso livre, inclusive hospedagem própria). React, React Router, Express e demais bibliotecas são MIT/BSD.
- **Dados de empresas:** razão social, CNPJ e nome fantasia não são dados pessoais, mas o nome, e-mail e telefone da pessoa de contato são.
- **Prints e grupos de mensagens:** print com dados reais enviado em grupo de WhatsApp é vazamento. Usar dados fictícios.

## 9. O que não se aplica a este sistema

| Item | Por quê |
|---|---|
| Política de reembolso | Não há venda nem pagamento no sistema. As doações em dinheiro (PIX) acontecem fora dele |
| Avaliações e promessas falsas | Não há avaliações, depoimentos nem propaganda. Mantenha os textos sem prometer segurança absoluta ou funcionamento ininterrupto |
| Aviso de cookies | Não usamos cookies. O único armazenamento é o token de login, estritamente necessário. **Se um dia entrar analytics, pixel ou publicidade, será preciso consentimento e banner** |
| Scripts de tracking | Não há nenhum |
| Formulário específico da LGPD | Para agente de pequeno porte, um canal de comunicação (e-mail) atende ⚖️ |

## 10. Decisões que dependem da ONG

1. Quem é o responsável pelos dados na ONG e qual e-mail será o canal de privacidade?
2. Quanto tempo guardar o histórico e os dados de ex-voluntários?
3. Quem terá perfil de administrador?
4. Em que região ficará a hospedagem?
5. Quem é o titular do código e como ele será licenciado para a ONG?
6. A ONG tem assessoria jurídica para revisar os textos?