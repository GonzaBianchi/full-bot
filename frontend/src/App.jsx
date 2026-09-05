import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import Landing from './pages/Landing';
import { useMe } from './hooks/queries';
import { authService, loginUrl } from './services/api';

// El leaderboard público es la ruta que más se comparte fuera del servidor:
// no tiene por qué descargar el panel de configuración entero.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const GuildSettings = lazy(() => import('./pages/GuildSettings'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const RoleMenus = lazy(() => import('./pages/RoleMenus'));
const NotFound = lazy(() => import('./pages/NotFound'));

/**
 * Manda a Discord conservando la ruta pedida, para volver a ella tras el login
 * en vez de aterrizar siempre en la home.
 */
function RequireAuth({ user, isPending, children }) {
  const location = useLocation();
  const needsLogin = !isPending && !user;

  useEffect(() => {
    if (needsLogin) {
      window.location.href = loginUrl(location.pathname + location.search);
    }
  }, [needsLogin, location.pathname, location.search]);

  if (isPending) return <LoadingSpinner text="Verificando sesión..." />;
  if (needsLogin) return <LoadingSpinner text="Redirigiendo a Discord..." />;

  return children;
}

function AppContent({ user, isPending, onLogout }) {
  const location = useLocation();

  // El leaderboard es público y trae su propia cabecera.
  const isPublicLeaderboard = location.pathname.endsWith('/leaderboard');
  const isGuildSettings = location.pathname.startsWith('/guild/') && !isPublicLeaderboard;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {!isPublicLeaderboard && <Navbar user={user} onLogout={onLogout} />}

      <div className={`flex-1 ${isGuildSettings ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Landing user={user} />} />

              {/* Ruta pública: cualquiera con el link ve el ranking */}
              <Route path="/guild/:guildId/leaderboard" element={<Leaderboard />} />

              <Route
                path="/dashboard"
                element={
                  <RequireAuth user={user} isPending={isPending}>
                    <Dashboard user={user} />
                  </RequireAuth>
                }
              />
              <Route
                path="/guild/:guildId"
                element={
                  <RequireAuth user={user} isPending={isPending}>
                    <GuildSettings />
                  </RequireAuth>
                }
              />
              <Route
                path="/guild/:guildId/role-menus"
                element={
                  <RequireAuth user={user} isPending={isPending}>
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                      <RoleMenus />
                    </div>
                  </RequireAuth>
                }
              />

              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function App() {
  const { data: user, isPending } = useMe();
  const queryClient = useQueryClient();

  const onLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    } finally {
      queryClient.clear();
      window.location.href = '/';
    }
  };

  return (
    <BrowserRouter>
      <AppContent user={user} isPending={isPending} onLogout={onLogout} />
    </BrowserRouter>
  );
}

export default App;
