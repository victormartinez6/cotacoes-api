import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

// Lista de moedas para rota geral
const moedas = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CLP'];

// Percentual de spread aplicado sobre o valor de venda (ex: 2%)
const SPREAD_PERCENTUAL = 0.02;

// Rota geral para todas as moedas
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

// Rota individual com spread aplicado
app.get('/cotacao/:moeda', async (req, res) => {
  try {
    const moeda = req.params.moeda.toUpperCase();
    const url = `https://economia.awesomeapi.com.br/last/${moeda}-BRL`;
    const response = await axios.get(url);
    const info = response.data[`${moeda}BRL`];
    const data = new Date(Number(info.timestamp) * 1000);

    const valorCompra = parseFloat(info.bid);
    const valorVenda = parseFloat(info.ask);
    const vendaComSpread = valorVenda * (1 + SPREAD_PERCENTUAL);

    res.json({
      moeda: info.code,
      nome: info.name,
      compra: valorCompra,
      venda: valorVenda,
      vendaComSpread: vendaComSpread.toFixed(4),
      spreadPercentual: SPREAD_PERCENTUAL * 100,
      dataHora: data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar cotação' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

