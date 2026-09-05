import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export async function connect(uri, options = {}) {
  const opts = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 2,
    // En producción los índices se crean con un despliegue o script, no en
    // cada arranque del proceso.
    autoIndex: process.env.NODE_ENV !== 'production',
    ...options
  };

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      await mongoose.connect(uri, opts);
      logger.info('Conectado a MongoDB');
      return mongoose.connection;
    } catch (e) {
      attempts++;
      logger.warn(`Intento ${attempts} fallido al conectar a MongoDB: ${e.message}`);
      if (attempts >= maxAttempts) {
        logger.error('No se pudo conectar a MongoDB después de varios intentos');
        throw e;
      }
      await new Promise(r => setTimeout(r, 2000 * attempts));
    }
  }
}

export default { connect };

/**
 * Promesa del MongoClient subyacente, para reutilizar el pool de Mongoose en
 * connect-mongo. `mongoose.connection.asPromise()` no sirve: resuelve de
 * inmediato aunque la conexión aún no esté abierta, y getClient() sería
 * undefined.
 */
export function mongoClientPromise() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection.getClient());
  }

  return new Promise((resolve, reject) => {
    mongoose.connection.once('connected', () => resolve(mongoose.connection.getClient()));
    mongoose.connection.once('error', reject);
  });
}
