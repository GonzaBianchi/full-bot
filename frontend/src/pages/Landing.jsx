// frontend/src/pages/Landing.jsx
import { Link } from 'react-router-dom';
import { Users, TrendingUp, Shield, Trophy, Cake, Film, LayoutDashboard } from 'lucide-react';
import { useBotInfo } from '../hooks/queries';
import { loginUrl } from '../services/api';

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Sistema de XP',
    text: 'Los miembros ganan experiencia por participar y suben de nivel automáticamente.',
    accent: 'from-indigo-500/20 to-purple-500/20',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400'
  },
  {
    icon: Shield,
    title: 'Roles automáticos',
    text: 'Asigná roles al alcanzar un nivel, al entrar al servidor o por reacción.',
    accent: 'from-purple-500/20 to-pink-500/20',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400'
  },
  {
    icon: Trophy,
    title: 'Logros',
    text: 'Definí logros por niveles, mensajes o boosts, con notificación e imagen propia.',
    accent: 'from-amber-500/20 to-orange-500/20',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400'
  },
  {
    icon: Users,
    title: 'Leaderboard público',
    text: 'Un ranking que se actualiza en vivo y que podés compartir fuera del servidor.',
    accent: 'from-green-500/20 to-teal-500/20',
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400'
  },
  {
    icon: Cake,
    title: 'Cumpleaños',
    text: 'El bot saluda automáticamente a quien cumple años, con mención y embed.',
    accent: 'from-pink-500/20 to-rose-500/20',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400'
  },
  {
    icon: Film,
    title: 'Filtro multimedia',
    text: 'Reenviá imágenes, videos y GIFs de varios canales a uno solo, ordenado.',
    accent: 'from-sky-500/20 to-cyan-500/20',
    iconBg: 'bg-sky-500/20',
    iconColor: 'text-sky-400'
  }
];

function Landing({ user }) {
  const { data: botInfo } = useBotInfo();

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center space-y-6">
            {botInfo?.avatarURL && (
              <div className="relative">
                <img
                  src={botInfo.avatarURL}
                  alt={botInfo.username}
                  className="w-24 h-24 rounded-full ring-4 ring-indigo-500/50 shadow-2xl"
                />
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            )}

            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-3">
                {botInfo?.username ?? 'Bot de niveles para Discord'}
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl">
                Niveles, roles automáticos, logros y moderación de multimedia,
                configurables desde un panel web.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {user ? (
                <Link
                  to="/dashboard"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Ir al panel</span>
                </Link>
              ) : (
                <a
                  href={loginUrl('/dashboard')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                >
                  <span>Iniciar sesión con Discord</span>
                </a>
              )}
            </div>
          </div>

          {/* Métricas del bot */}
          {botInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-14">
              <StatCard
                icon={Users}
                iconBg="bg-indigo-500/20"
                iconColor="text-indigo-400"
                label="Servidores"
                value={(botInfo.guildCount ?? 0).toLocaleString()}
              />
              <StatCard
                icon={TrendingUp}
                iconBg="bg-purple-500/20"
                iconColor="text-purple-400"
                label="Usuarios alcanzados"
                value={(botInfo.userCount ?? 0).toLocaleString()}
              />
              <StatCard
                icon={Shield}
                iconBg="bg-green-500/20"
                iconColor="text-green-400"
                label="Estado"
                value="Operativo"
              />
            </div>
          )}
        </div>
      </div>

      {/* Características */}
      <div className="relative overflow-hidden pb-20">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-3">
            Qué puede hacer en tu servidor
          </h2>
          <p className="text-center text-gray-400 mb-12">
            Todo se configura desde el panel, sin comandos de texto.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, text, accent, iconBg, iconColor }) => (
              <div
                key={title}
                className={`bg-gradient-to-r ${accent} backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-indigo-500/50 transition-all`}
              >
                <div className={`${iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center space-x-4">
        <div className={`${iconBg} p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default Landing;
