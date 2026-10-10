-- Este arquivo APAGA e recria as tabelas. Use só em ambiente de
-- desenvolvimento ou na primeira configuração de um banco novo.

DROP TABLE IF EXISTS movimentacoes CASCADE;
DROP TABLE IF EXISTS lotes CASCADE;
DROP TABLE IF EXISTS itens CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS doadores CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ---------------------------------------------------------------------
-- USUÁRIOS (quem faz login no sistema)
-- A senha NUNCA é salva em texto puro: o backend guarda só o hash (bcrypt).
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(160) NOT NULL UNIQUE,
    senha_hash  VARCHAR(255) NOT NULL,
    perfil      VARCHAR(20)  NOT NULL DEFAULT 'voluntario'
                CHECK (perfil IN ('admin', 'voluntario')),
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- CATEGORIAS (alimento, higiene, roupa, brinquedo...)
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
    id    SERIAL PRIMARY KEY,
    nome  VARCHAR(80) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- DOADORES (pessoa física, empresa ou campanha)
-- ---------------------------------------------------------------------
CREATE TABLE doadores (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(160) NOT NULL,
    tipo       VARCHAR(20)  NOT NULL DEFAULT 'pessoa_fisica'
               CHECK (tipo IN ('pessoa_fisica', 'empresa', 'campanha')),
    contato    VARCHAR(160),
    criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- ITENS (o "tipo" de produto: arroz, sabonete, camiseta...)
-- controla_validade = FALSE para itens sem validade (roupas, brinquedos)
-- ---------------------------------------------------------------------
CREATE TABLE itens (
    id                SERIAL PRIMARY KEY,
    nome              VARCHAR(120) NOT NULL,
    categoria_id      INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    unidade           VARCHAR(20)  NOT NULL DEFAULT 'un',  -- un, kg, l, pacote...
    controla_validade BOOLEAN      NOT NULL DEFAULT TRUE,
    ativo             BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em         TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (nome, categoria_id)
);

-- ---------------------------------------------------------------------
-- LOTES (cada entrada de doação de um item, com sua validade própria)
-- data_validade é NULL quando o item não controla validade.
-- (A regra "item com validade exige data_validade" fica na API.)
-- ---------------------------------------------------------------------
CREATE TABLE lotes (
    id                  SERIAL PRIMARY KEY,
    item_id             INTEGER NOT NULL REFERENCES itens(id) ON DELETE RESTRICT,
    doador_id           INTEGER REFERENCES doadores(id) ON DELETE SET NULL,
    quantidade_inicial  NUMERIC(12,2) NOT NULL CHECK (quantidade_inicial > 0),
    quantidade_atual    NUMERIC(12,2) NOT NULL CHECK (quantidade_atual >= 0),
    data_validade       DATE,
    data_entrada        DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao          TEXT,
    criado_em           TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (quantidade_atual <= quantidade_inicial)
);

-- ---------------------------------------------------------------------
-- MOVIMENTAÇÕES (histórico de entradas e saídas de cada lote)
-- A API deve gravar a movimentação e atualizar lotes.quantidade_atual
-- na mesma transação.
-- ---------------------------------------------------------------------
CREATE TABLE movimentacoes (
    id          SERIAL PRIMARY KEY,
    lote_id     INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade  NUMERIC(12,2) NOT NULL CHECK (quantidade > 0),
    destino     VARCHAR(160),   -- para saídas: quem/onde recebeu
    observacao  TEXT,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- ÍNDICES (deixam o painel de vencimento e as buscas rápidos)
-- ---------------------------------------------------------------------
CREATE INDEX idx_lotes_validade  ON lotes (data_validade);
CREATE INDEX idx_lotes_item      ON lotes (item_id);
CREATE INDEX idx_itens_categoria ON itens (categoria_id);
CREATE INDEX idx_mov_lote        ON movimentacoes (lote_id);
CREATE INDEX idx_mov_criado_em   ON movimentacoes (criado_em);

-- ---------------------------------------------------------------------
-- DADOS INICIAIS (categorias básicas)
-- ---------------------------------------------------------------------
INSERT INTO categorias (nome) VALUES
    ('Alimentos'),
    ('Higiene e limpeza'),
    ('Roupas e calçados'),
    ('Brinquedos'),
    ('Material escolar'),
    ('Outros');