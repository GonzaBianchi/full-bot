import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot keepalive running!');
});

app.listen(PORT, () => {
  console.log(`Keepalive server running on port ${PORT}`);
});
