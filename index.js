import express from "express";
import axios from "axios";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Lista de moedas
const moedas = ["USD", "EUR", "GBP", "CAD", "AUD"];

// Spread percentual por moeda
const SPREADS = {
  USD: 0.085,
  EUR: 0.085,
  GBP: 0.099,
  CAD: 0.064,
  AUD: 0.064,
};

const AWESOME_API_KEY = process.env.AWESOME_API_KEY;

// Base URL correta para “json/…”
const http = axios.create({
  baseURL: "https://economia.awesomeapi.com.br/json",
  timeout: 8000,
  headers: {
    Accept: "application/json",
    "User-Agent": "cotacoes-api/1.0",
    ...(AWESOME_API_KEY ? { "x-api-key": AWESOME_API_KEY } : {}),
  },
});

// Rotas básicas de teste
app.get("/", (req, res) => res.status(200).json({ ok: true, service: "cotacoes-api" }));
app.get("/health", (req, res) => res.status(200).json({ ok: true }));

function formatSemSpread(info) {
  const data = new Date(Number(info.timestamp) * 1000);
  return {
    moeda: info.code,
    nome: info.name,
    compra: Number(parseFloat(info.bid).toFixed(2)),
    venda: Number(parseFloat(info.ask).toFixed(2)),
    dataHora: data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
  };
}

// GET /cotacoes (sem spread)
app.get("/cotacoes", async (req, res) => {
  try {
    const pares = moedas.map((m) => `${m}-BRL`).join(",");

    // token como fallback (além do header)
    const path = AWESOME_API_KEY ? `/last/${pares}?token=${AWESOME_API_KEY}` : `/last/${pares}`;

    const { data } = await http.get(path);
    const resultado = Object.keys(data).map((key) => formatSemSpread(data[key]));

    return res.json({ cotacoes: resultado });
  } catch (error) {
    const status = error?.response?.status;

    console.error("Erro /cotacoes:", {
      message: error?.message,
      code: error?.code,
      status,
      data: error?.response?.data,
    });

    return res.status(status === 429 ? 429 : 502).json({
      erro: status === 429 ? "Rate limit do provedor de cotações" : "Erro ao buscar cotações",
      detalhe: status ? `AwesomeAPI status ${status}` : (error?.code || "Falha/timeout"),
    });
  }
});

// GET /cotacao/:moeda (com spread)
app.get("/cotacao/:moeda", async (req, res) => {
  try {
    const moeda = String(req.params.moeda || "").toUpperCase();

    if (!SPREADS[moeda]) {
      return res.status(400).json({ erro: `Moeda ${moeda} não suportada.` });
    }

    const pair = `${moeda}-BRL`;

    // token como fallback (além do header)
    const path = AWESOME_API_KEY ? `/last/${pair}?token=${AWESOME_API_KEY}` : `/last/${pair}`;

    const { data } = await http.get(path);
    const info = data[`${moeda}BRL`];

    if (!info) {
      return res.status(502).json({ erro: "Resposta inesperada da AwesomeAPI" });
    }

    const dataHora = new Date(Number(info.timestamp) * 1000).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    const valorCompra = parseFloat(info.bid);
    const valorVenda = parseFloat(info.ask);
    const spread = SPREADS[moeda];
    const vendaComSpread = valorVenda * (1 + spread);

    return res.json({
      Data: {
        moeda: info.code,
        nome: info.name,
        compra: Number(valorCompra.toFixed(2)),
        venda: Number(valorVenda.toFixed(2)),
        vendaComSpread: Number(vendaComSpread.toFixed(2)),
        spreadPercentual: Number((spread * 100).toFixed(2)),
        dataHora,
      },
    });
  } catch (error) {
    const status = error?.response?.status;

    console.error("Erro /cotacao/:moeda:", {
      message: error?.message,
      code: error?.code,
      status,
      data: error?.response?.data,
    });

    return res.status(status === 429 ? 429 : 502).json({
      erro: status === 429 ? "Rate limit do provedor de cotações" : "Erro ao buscar cotação",
      detalhe: status ? `AwesomeAPI status ${status}` : (error?.code || "Falha/timeout"),
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`AWESOME_API_KEY configurada? ${Boolean(AWESOME_API_KEY)}`);
});
