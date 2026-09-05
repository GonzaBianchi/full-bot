import { format } from 'node:util';
import pino from 'pino';

// El logger anterior mandaba todo a console.log —errores incluidos, así que
// nada llegaba a stderr—, no filtraba por nivel y calculaba `isProd` sin usarlo.
const isProd = process.env.NODE_ENV === 'production';

const base = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  ...(isProd ? {} : {
    // En desarrollo, salida legible; en producción, JSON a stdout.
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
    }
  })
});

// Las llamadas existentes tienen la forma logger.info('texto', err, obj).
// util.format reproduce ese comportamiento sobre la API de pino, que espera
// (obj, mensaje), sin tener que reescribir cientos de call sites.
const write = (level) => (...args) => {
  if (!base.isLevelEnabled(level)) return;
  base[level](format(...args));
};

export default {
  debug: write('debug'),
  info: write('info'),
  warn: write('warn'),
  error: write('error')
};
