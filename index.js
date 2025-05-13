import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

// Lista de moedas
const moedas = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CLP'];

// Spread percentual por moeda
const SPREADS = {
  USD: 0.042,
  EUR: 0.042,
  GBP: 0.075,
  CAD: 0.050,
  AUD: 0.050,
  CLP: 0.05
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
        compra: parseFloat(moeda.bid),
        venda: parseFloat(moeda.ask),
        dataHora: data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      };
    });

    res.json({ cotacoes: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar cotações' });
  }
});

// Rota individual com spread personalizado por moeda (com retorno em 'data')
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
      data: {
        moeda: info.code,
        nome: info.name,
        compra: valorCompra,
        venda: valorVenda,
        vendaComSpread: vendaComSpread.toFixed(4),
        spreadPercentual: spread * 100,
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

// trigger redeploy

