-- =====================================================================
-- Migração 001: permissões por usuário, senha temporária e anonimização.
--
-- Para quem JÁ tinha o banco criado antes desta mudança. Quem criar o banco
-- agora, com o schema.sql novo, NÃO precisa rodar este arquivo.
--
--   psql -U postgres -d ong_estoque -f backend/database/migrations/001_permissoes_e_anonimizacao.sql
--
-- É seguro rodar mais de uma vez.
-- =====================================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deve_trocar_senha BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMP;
ALTER TABLE doadores ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMP;

-- A coluna de permissões só é criada (e preenchida) na primeira vez.
-- Quem já existia mantém tudo o que podia fazer antes; o admin passa a
-- conceder ou tirar permissões depois, pela tela de Usuários.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_name = 'usuarios' AND column_name = 'permissoes'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN permissoes TEXT[] NOT NULL DEFAULT '{}';
        UPDATE usuarios SET permissoes = ARRAY[
            'registrar_doacao', 'dar_saida', 'gerenciar_itens',
            'gerenciar_doadores', 'ver_historico'
        ]::text[];
    END IF;
END $$;