import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export async function connect(uri, options = {}) {
  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    // merge user options
    ...options
  };

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      await mongoose.connect(uri, opts);
      logger.info('Conectado a MongoDB Atlas');
      return mongoose.connection;
    } catch (e) {
      attempts++;
      logger.warn(`Intento ${attempts} fallido al conectar a MongoDB: ${e.message}`);
      if (attempts >= maxAttempts) {
        logger.error('No se pudo conectar a MongoDB después de varios intentos');
        throw e;
      }
      // esperar antes de reintentar
      await new Promise(r => setTimeout(r, 2000 * attempts));
    }
  }
}

export default { connect };