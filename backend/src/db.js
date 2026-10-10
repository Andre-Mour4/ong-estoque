require("dotenv").config();
const { Pool } = require("pg");

// Pool = conjunto de conexões reaproveitadas pela API.
// Todo arquivo que precisar consultar o banco importa este módulo.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Bancos na nuvem (Neon, Render...) exigem SSL; o banco local não.
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (erro) => {
  console.error("Erro inesperado no pool do PostgreSQL:", erro);
});

module.exports = pool;