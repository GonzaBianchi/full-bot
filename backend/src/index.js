// Backend básico con Express
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import config from './config.js';
import { setupAuth } from './auth.js';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Configurar autenticación
setupAuth(app);

// Conexión a MongoDB
mongoose.connect(config.mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('API Backend funcionando');
});

// Socket.io de prueba
io.on('connection', (socket) => {
  console.log('Cliente conectado vía WebSocket');
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

server.listen(config.port, () => {
  console.log(`Backend escuchando en puerto ${config.port}`);
});
