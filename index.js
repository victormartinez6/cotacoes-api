import express from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

const moedas = ['USD-BRL', 'EUR-BRL', 'GBP-BRL', 'CAD-BRL', 'AUD-BRL', 'CLP-BRL'];

app.get('/cotacoes', async (req, res) => {
  try {
    const url = `https://economia.awesomeapi.com.br/last/${moedas.join(',')}`;
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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
