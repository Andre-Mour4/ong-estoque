require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

// Libera o frontend (outra porta) a chamar a API e lê JSON no corpo das requisições.
// Em produção, vamos restringir o cors() ao endereço do frontend.
app.use(cors());
app.use(express.json());

// Rota de teste: confirma que a API está no ar e que o banco responde.
app.get("/api/saude", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT COUNT(*)::int AS total FROM categorias"
    );
    res.json({
      status: "ok",
      banco: "conectado",
      categorias: resultado.rows[0].total,
    });
  } catch (erro) {
    console.error("Falha ao consultar o banco:", erro.message);
    res.status(500).json({ status: "erro", banco: "desconectado" });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});