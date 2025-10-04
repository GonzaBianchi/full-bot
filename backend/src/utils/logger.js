const isProd = process.env.NODE_ENV === 'production';

const levels = { info: 'INFO', warn: 'WARN', error: 'ERROR' };

function format(level, ...args) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${levels[level]}]`;
  console.log(prefix, ...args);
}

export default {
  info: (...args) => format('info', ...args),
  warn: (...args) => format('warn', ...args),
  error: (...args) => format('error', ...args)
};
