import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

// Lista de moedas
const moedas = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

// Spread percentual por moeda
const SPREADS = {
  USD: 0.064,
  EUR: 0.063,
  GBP: 0.099,
  CAD: 0.094,
  AUD: 0.094
};

// Rota geral (sem spread)
app.get('/cotacoes', async (req, res) => {
  try {
    const url = `https://economia.awesomeapi.com.br/last/${moedas.map(m => `${m}-BRL`).join(',')}`;
    const response = await axios.get(url);
    const dados = response.data;

const resultado = Object.keys(dados).map(key => {
  const moeda = dados[key];
  const data = new Date(Number(moeda.timestamp) * 1000);
  return {
    moeda: moeda.code,
    nome: moeda.name,
    compra: parseFloat(parseFloat(moeda.bid).toFixed(2)),
    venda: parseFloat(parseFloat(moeda.ask).toFixed(2)),
    dataHora: data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  };
});

    res.json({ cotacoes: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar cotações' });
  }
});

// Rota individual com spread e resposta apenas com 'Data' para Umbler
app.get('/cotacao/:moeda', async (req, res) => {
  try {
    const moeda = req.params.moeda.toUpperCase();

    if (!SPREADS[moeda]) {
      return res.status(400).json({ erro: `Moeda ${moeda} não suportada.` });
    }

    const url = `https://economia.awesomeapi.com.br/last/${moeda}-BRL`;
    const response = await axios.get(url);
    const info = response.data[`${moeda}BRL`];
    const data = new Date(Number(info.timestamp) * 1000);

const valorCompra = parseFloat(info.bid);
const valorVenda = parseFloat(info.ask);
const spread = SPREADS[moeda];
const vendaComSpread = valorVenda * (1 + spread);

res.json({
  Data: {
    moeda: info.code,
    nome: info.name,
    compra: parseFloat(valorCompra.toFixed(2)),
    venda: parseFloat(valorVenda.toFixed(2)),
    vendaComSpread: parseFloat(vendaComSpread.toFixed(2)),
    spreadPercentual: parseFloat((spread * 100).toFixed(2)),
    dataHora: data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }
});

  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar cotação' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});