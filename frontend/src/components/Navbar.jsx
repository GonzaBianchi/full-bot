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
    <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
      <div className="px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <Home className="w-6 h-6 text-[#5865f2]" />
            <span className="text-white font-bold text-xl">Bot RunicHexCore</span>
          </Link>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src={getAvatarUrl()} 
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
              <span className="text-white font-medium">
                {user.username}
              </span>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-[#ed4245] hover:bg-red-600 text-white rounded-md transition-colors cursor-pointer"
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