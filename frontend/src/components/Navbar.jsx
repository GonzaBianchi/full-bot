import { Link } from 'react-router-dom';
import { LogOut, Home } from 'lucide-react';

function Navbar({ user, onLogout }) {
  const getAvatarUrl = () => {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    }
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
  };

  return (
    <nav className="bg-discord-gray border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <Home className="w-6 h-6 text-discord-blurple" />
            <span className="text-white font-bold text-xl">Bot Dashboard</span>
          </Link>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src={getAvatarUrl()} 
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
              <span className="text-white font-medium">
                {user.username}#{user.discriminator}
              </span>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-discord-red hover:bg-red-600 text-white rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;