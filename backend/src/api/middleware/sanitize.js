// Las rutas construyen su update con whitelist, pero varias pasan objetos del
// cuerpo tal cual a Mongoose. Una clave que empiece por `$` se interpreta como
// operador de update ($unset, $rename), y una con `.` alcanza campos anidados.
// Ninguna entrada legítima de esta API usa esas formas.
const FORBIDDEN_KEY = /^\$|\./;
const MAX_DEPTH = 10;

function stripKeys(value, depth = 0) {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const item of value) stripKeys(item, depth + 1);
    return;
  }

  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEY.test(key)) {
      delete value[key];
      continue;
    }
    stripKeys(value[key], depth + 1);
  }
}

export function sanitizeMongoInput(req, res, next) {
  stripKeys(req.body);
  stripKeys(req.query);
  stripKeys(req.params);
  next();
}

export default sanitizeMongoInput;
