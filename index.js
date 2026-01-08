import express from "express";
import axios from "axios";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Lista de moedas
const moedas = ["USD", "EUR", "GBP", "CAD", "AUD"];

// Spread percentual por moeda
const SPREADS = {
  USD: 0.067,
  EUR: 0.066,
  GBP: 0.099,
  CAD: 0.064,
  AUD: 0.064,
};

// Axios configurado com API Key (privada) + timeout
const http = axios.create({
  timeout: 8000,
  headers: {
    Accept: "application/json",
    "User-Agent": "cotacoes-api/1.0",
    ...(process.env.AWESOME_API_KEY
      ? { "x-api-key": process.env.AWESOME_API_KEY }
      : {}),
  },
});

// Rotas básicas (facilitam teste e healthcheck)
app.get("/", (req, res) => {
  res.status(200).json({ ok: true, service: "cotacoes-api" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Helpers
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

// Rota geral (sem spread)
app.get("/cotacoes", async (req, res) => {
  try {
    const pares = moedas.map((m) => `${m}-BRL`).join(",");
    const url = `https://economia.awesomeapi.com.br/last/${pares}`;

    const response = await http.get(url);
    const dados = response.data;

    const resultado = Object.keys(dados).map((key) => formatSemSpread(dados[key]));
    return res.json({ cotacoes: resultado });
  } catch (error) {
    const status = error?.response?.status;

    console.error("Erro /cotacoes:", {
      message: error?.message,
      code: error?.code,
      status,
      data: error?.response?.data,
    });

    // Se a AwesomeAPI devolveu 429, repasse (não mascare como 502)
    if (status === 429) {
      return res.status(429).json({
        erro: "Rate limit do provedor de cotações",
        detalhe: "Tente novamente em alguns segundos.",
      });
    }

    return res.status(502).json({
      erro: "Erro ao buscar cotações",
      detalhe: status ? `AwesomeAPI status ${status}` : (error?.code || "Falha/timeout"),
    });
  }
});

// Rota individual com spread e resposta em 'Data'
app.get("/cotacao/:moeda", async (req, res) => {
  try {
    const moeda = String(req.params.moeda || "").toUpperCase();

    if (!SPREADS[moeda]) {
      return res.status(400).json({ erro: `Moeda ${moeda} não suportada.` });
    }

    const url = `https://economia.awesomeapi.com.br/last/${moeda}-BRL`;
    const response = await http.get(url);
    const info = response.data[`${moeda}BRL`];

    if (!info) {
      return res.status(502).json({ erro: "Resposta inesperada da AwesomeAPI" });
    }

    const data = new Date(Number(info.timestamp) * 1000);

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
        dataHora: data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
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

    if (status === 429) {
      return res.status(429).json({
        erro: "Rate limit do provedor de cotações",
        detalhe: "Tente novamente em alguns segundos.",
      });
    }

    return res.status(502).json({
      erro: "Erro ao buscar cotação",
      detalhe: status ? `AwesomeAPI status ${status}` : (error?.code || "Falha/timeout"),
    });
  }
});

// Importante para Railway/containers
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`AWESOME_API_KEY configurada? ${Boolean(process.env.AWESOME_API_KEY)}`);
});
