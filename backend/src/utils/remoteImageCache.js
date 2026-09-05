import { loadImage } from '@napi-rs/canvas';
import { safeImageFetch } from './safeImageFetch.js';
import logger from './logger.js';

// Los fondos de las tarjetas y los emojis de twemoji se descargaban y
// decodificaban en CADA render. Son inmutables por URL, así que basta con
// guardar la imagen ya decodificada.
const MAX_ENTRIES = 60;
const TTL_MS = 30 * 60 * 1000;

const cache = new Map();   // url -> { image, ts }
const inFlight = new Map(); // url -> Promise, para no descargar dos veces a la vez

setInterval(() => {
  const now = Date.now();
  for (const [url, entry] of cache.entries()) {
    if (now - entry.ts > TTL_MS) cache.delete(url);
  }
}, TTL_MS).unref();

function remember(url, image) {
  if (cache.size >= MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(url, { image, ts: Date.now() });
}

/**
 * Devuelve la imagen decodificada de una URL, o null si no se pudo obtener.
 * Nunca lanza: el llamador dibuja su fondo por defecto.
 */
export async function loadRemoteImage(url) {
  if (!url) return null;

  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.image;

  if (inFlight.has(url)) return inFlight.get(url);

  const promise = (async () => {
    try {
      const image = await loadImage(await safeImageFetch(url));
      remember(url, image);
      return image;
    } catch (error) {
      logger.warn(`No se pudo cargar la imagen ${url}: ${error.message}`);
      return null;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, promise);
  return promise;
}

export function invalidateRemoteImage(url) {
  if (url) cache.delete(url);
}
