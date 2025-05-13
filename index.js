import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Spread percentual por moeda
const SPREADS = {
  USD: 0.042,
  EUR: 0.042,
  GBP: 0.075,
  CAD: 0.040,
  AUD: 0.040,
  CLP: 0.05
};

// Rota POST para buscar cotação com spread por moeda informada
app.post('/cotacao', async (req, res) => {
  try {
    const moeda = (req.body.moeda || '').toUpperCase();

    if (!SPREADS[moeda]) {
      return res.status(400).json({ erro: `Moeda '${moeda}' não suportada.` });
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
      moeda: info.code,
      nome: info.name,
      compra: valorCompra,
      venda: valorVenda,
      vendaComSpread: vendaComSpread.toFixed(4),
      spreadPercentual: spread * 100,
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
