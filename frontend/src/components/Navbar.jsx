import { Link } from 'react-router-dom';
import { LogOut, Home, LayoutDashboard } from 'lucide-react';
import { loginUrl } from '../services/api';

function Navbar({ user, onLogout }) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${(Number(user?.discriminator) || 0) % 5}.png`;

  return (
    <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <Link to="/" className="flex items-center space-x-3 min-w-0">
            <Home className="w-6 h-6 text-[#5865f2] flex-shrink-0" />
            <span className="text-white font-bold text-lg sm:text-xl truncate">
              Bot RunicHexCore
            </span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                to="/dashboard"
                className="hidden sm:flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Panel</span>
              </Link>

              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                <span className="text-white font-medium hidden sm:inline truncate">
                  {user.username}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#ed4245] hover:bg-red-600 text-white rounded-md transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : (
            <a
              href={loginUrl('/dashboard')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            >
              Iniciar sesión
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
