import express from "express";
import axios from "axios";
import dns from "node:dns";
import https from "node:https";

dns.setDefaultResultOrder("ipv4first"); // importante em alguns ambientes (Railway/IPv6)

const app = express();
const PORT = process.env.PORT || 3000;

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

// Axios “robusto” (timeout + agent)
const http = axios.create({
  timeout: 8000,
  httpsAgent: new https.Agent({ keepAlive: true, family: 4 }), // força IPv4
  headers: {
    "User-Agent": "cotacoes-api/1.0",
    Accept: "application/json",
  },
});

// Rotas básicas para teste/health
app.get("/", (req, res) => {
  res.status(200).json({ ok: true, service: "cotacoes-api" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Rota geral (sem spread)
app.get("/cotacoes", async (req, res) => {
  try {
    const url = `https://economia.awesomeapi.com.br/last/${moedas.map((m) => `${m}-BRL`).join(",")}`;
    const response = await http.get(url);
    const dados = response.data;

    const resultado = Object.keys(dados).map((key) => {
      const moeda = dados[key];
      const data = new Date(Number(moeda.timestamp) * 1000);
      return {
        moeda: moeda.code,
        nome: moeda.name,
        compra: Number(parseFloat(moeda.bid).toFixed(2)),
        venda: Number(parseFloat(moeda.ask).toFixed(2)),
        dataHora: data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      };
    });

    res.json({ cotacoes: resultado });
  } catch (error) {
    console.error("Erro /cotacoes:", {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    res.status(502).json({
      erro: "Erro ao buscar cotações",
      detalhe: error?.response?.status ? `AwesomeAPI status ${error.response.status}` : (error?.code || "Falha/timeout"),
    });
  }
});

// Rota individual com spread
app.get("/cotacao/:moeda", async (req, res) => {
  try {
    const moeda = req.params.moeda.toUpperCase();

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

    res.json({
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
    console.error("Erro /cotacao/:moeda:", {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    res.status(502).json({
      erro: "Erro ao buscar cotação",
      detalhe: error?.response?.status ? `AwesomeAPI status ${error.response.status}` : (error?.code || "Falha/timeout"),
    });
  }
});

// Bind explícito (bom para containers/proxy)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
