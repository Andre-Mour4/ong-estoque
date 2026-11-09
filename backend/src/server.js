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
const EM_PRODUCAO = process.env.NODE_ENV === "production";

app.disable("x-powered-by"); // não anuncia que o servidor usa Express

// CORS = quais sites podem chamar a API pelo navegador.
// - CORS_ORIGIN definido: só esses endereços (separe vários por vírgula).
// - Não definido, em desenvolvimento: qualquer site (facilita testar).
// - Não definido, em produção: nenhum site de fora. Só funciona se o site e a API
//   estiverem no mesmo endereço (o servidor do site repassa /api para a API).
const origensPermitidas = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origem) => origem.trim().replace(/\/+$/, ""))
  .filter(Boolean);

if (origensPermitidas.length > 0) {
  app.use(cors({ origin: origensPermitidas }));
} else if (!EM_PRODUCAO) {
  app.use(cors());
} else {
  console.warn(
    "AVISO: CORS_ORIGIN não definido. Se o site e a API estiverem em endereços diferentes, o navegador vai bloquear as chamadas. Defina CORS_ORIGIN com o endereço do site."
  );
}

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

// Endereço de API que não existe: responde em JSON (o frontend espera JSON).
app.use("/api", (req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

// Qualquer erro não tratado: resposta em JSON, sem detalhes técnicos para quem está de fora.
// (os 4 parâmetros são o que faz o Express reconhecer isto como tratador de erros)
app.use((erro, req, res, next) => {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "Dados enviados em formato inválido." });
  }
  console.error("Erro não tratado:", erro.message);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});