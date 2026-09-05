// frontend/src/components/guild-settings/TopMembersChart.jsx
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

// Una sola serie, así que el color es secuencial de un solo tono: no hay
// identidad que distinguir y por eso tampoco lleva leyenda. El paso elegido
// pasa las comprobaciones de banda de luminosidad y contraste (>= 3:1) contra
// la superficie oscura del panel.
const SERIES = '#6366f1';
const GRID = '#374151';
const INK_MUTED = '#9ca3af';

const formatCompact = (value) =>
  new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatFull = (value) => Number(value ?? 0).toLocaleString('es-AR');

export function TopMembersChart({ members = [], loading }) {
  const data = members.map(member => ({
    name: member.username || 'Desconocido',
    xp: member.totalXp ?? 0,
    level: member.level ?? 0,
    messages: member.messageCount ?? 0
  }));

  return (
    <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-5 sm:p-6">
      <header className="mb-5">
        <h2 className="text-lg font-semibold text-white">XP de los 10 primeros</h2>
        <p className="text-gray-400 text-sm">
          Pasá el cursor por una barra para ver nivel y mensajes
        </p>
      </header>

      {loading ? (
        <div className="h-80 bg-gray-700/20 rounded-lg animate-pulse" />
      ) : data.length === 0 ? (
        <p className="text-gray-500 text-sm py-12 text-center">
          Todavía nadie ganó XP en este servidor.
        </p>
      ) : (
        <div style={{ height: Math.max(240, data.length * 38) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
              barCategoryGap="28%"
            >
              {/* Rejilla fina, solo en el eje de magnitud y por detrás de las barras */}
              <CartesianGrid horizontal={false} stroke={GRID} strokeWidth={1} />
              <XAxis
                type="number"
                tickFormatter={formatCompact}
                stroke={GRID}
                tick={{ fill: INK_MUTED, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                stroke={GRID}
                tick={{ fill: INK_MUTED, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                content={<MemberTooltip />}
              />
              <Bar
                dataKey="xp"
                fill={SERIES}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              >
                {data.map(entry => (
                  <Cell key={entry.name} fill={SERIES} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function MemberTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const { name, xp, level, messages } = payload[0].payload;

  return (
    <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-white font-medium text-sm mb-1">{name}</p>
      <dl className="text-xs space-y-0.5">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-400">XP</dt>
          <dd className="text-gray-200 tabular-nums">{formatFull(xp)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-400">Nivel</dt>
          <dd className="text-gray-200 tabular-nums">{formatFull(level)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-400">Mensajes</dt>
          <dd className="text-gray-200 tabular-nums">{formatFull(messages)}</dd>
        </div>
      </dl>
    </div>
  );
}
