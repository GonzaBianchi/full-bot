// frontend/src/components/guild-settings/LeaderboardSection.jsx
import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LeaderboardSection({ guildId }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-gray-400">Visualiza y gestiona el ranking de tu servidor</p>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="text-center py-8">
          <BarChart3 className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Ver Leaderboard del Servidor</p>
          <p className="text-gray-400 text-sm mb-4">Accede al ranking completo de usuarios</p>
          <button
            onClick={() => navigate(`/guild/${guildId}/leaderboard`)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Ver Leaderboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}