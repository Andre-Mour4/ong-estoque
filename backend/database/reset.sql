-- =====================================================================
-- ⚠️  APAGA TODAS AS TABELAS E TODOS OS DADOS.
-- Use SOMENTE em banco de desenvolvimento, para começar do zero.
-- NUNCA rode em um banco com dados reais da ONG.
--
-- Depois, rode o schema.sql para recriar as tabelas:
--   psql -U postgres -d ong_estoque -f backend/database/reset.sql
--   psql -U postgres -d ong_estoque -f backend/database/schema.sql
-- =====================================================================

DROP TABLE IF EXISTS movimentacoes CASCADE;
DROP TABLE IF EXISTS lotes CASCADE;
DROP TABLE IF EXISTS itens CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS doadores CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;