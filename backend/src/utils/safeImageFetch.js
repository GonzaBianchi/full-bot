import dns from 'node:dns/promises';
import net from 'node:net';

// Las URLs de fondo de las rank cards y de las notificaciones de logros las
// escribe un administrador desde el dashboard, y las descarga este servidor.
// Sin restricciones eso es un SSRF: bastaba apuntar a 169.254.169.254 o a un
// servicio interno para que el bot lo consultara por nosotros.
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

function isPrivateIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n))) return true;
  if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 169 && p[1] === 254) return true;              // link-local y metadata de nube
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
  return false;
}

function isPrivateIPv6(ip) {
  const a = ip.toLowerCase();
  if (a === '::1' || a === '::') return true;
  if (a.startsWith('fc') || a.startsWith('fd')) return true;  // unique local
  if (a.startsWith('fe80')) return true;                      // link-local
  if (a.startsWith('::ffff:')) return isPrivateIPv4(a.slice(7));
  return false;
}

function isPrivateAddress(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true; // no parece una IP: no arriesgamos
}

async function assertPublicHost(hostname) {
  // URL.hostname devuelve las IPv6 entre corchetes: https://[::1]/ -> "[::1]".
  const literal = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  if (net.isIP(literal)) {
    if (isPrivateAddress(literal)) throw new Error(`host no permitido: ${hostname}`);
    return;
  }

  const records = await dns.lookup(hostname, { all: true });
  if (records.length === 0) throw new Error(`host sin resolución: ${hostname}`);

  for (const { address } of records) {
    if (isPrivateAddress(address)) {
      throw new Error(`el host ${hostname} apunta a una dirección interna`);
    }
  }
}

/**
 * Descarga una imagen de una URL externa con las garantías mínimas:
 * solo https, host público (revalidado en cada redirección), timeout,
 * content-type de imagen y tamaño acotado.
 *
 * Lanza si algo no cuadra; el llamador decide el fallback.
 */
export async function safeImageFetch(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('URL inválida');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== 'https:') {
      throw new Error('solo se permiten URLs https');
    }
    await assertPublicHost(url.hostname);

    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'image/*' }
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error('redirección sin destino');
      // La siguiente vuelta revalida esquema y host del destino.
      url = new URL(location, url);
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) {
      throw new Error(`content-type no permitido: ${type || 'desconocido'}`);
    }

    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      throw new Error('imagen demasiado grande');
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      throw new Error('imagen demasiado grande');
    }

    return buffer;
  }

  throw new Error('demasiadas redirecciones');
}

export default safeImageFetch;
