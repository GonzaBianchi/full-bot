// El dominio del panel se configura por entorno; estaba quemado en cinco
// archivos distintos, cada uno con su propio valor por defecto.
export function dashboardUrl(path = '') {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/[/]+$/, '');
  if (!path) return base;
  return `${base}/${String(path).replace(/^[/]+/, '')}`;
}

export default dashboardUrl;
