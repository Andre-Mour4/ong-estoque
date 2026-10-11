require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const categoriasRoutes = require("./routes/categorias");
const itensRoutes = require("./routes/itens");
const doadoresRoutes = require("./routes/doadores");
const lotesRoutes = require("./routes/lotes");
const movimentacoesRoutes = require("./routes/movimentacoes");
const authRoutes = require("./routes/auth");
const usuariosRoutes = require("./routes/usuarios");
const { autenticar, apenasAdmin } = require("./middleware/auth");

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

// Pública: login (a rota /api/saude acima também continua pública).
app.use("/api/auth", authRoutes);

// Protegidas: exigem login (token JWT no cabeçalho Authorization).
app.use("/api/categorias", autenticar, categoriasRoutes);
app.use("/api/itens", autenticar, itensRoutes);
app.use("/api/doadores", autenticar, doadoresRoutes);
app.use("/api/lotes", autenticar, lotesRoutes);
app.use("/api/movimentacoes", autenticar, movimentacoesRoutes);

// Só administrador.
app.use("/api/usuarios", autenticar, apenasAdmin, usuariosRoutes);

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});