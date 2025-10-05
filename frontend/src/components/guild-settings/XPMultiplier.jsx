// frontend/src/components/guild-settings/XPMultiplier.jsx
import { TrendingUp } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';

const MULTIPLIER_VALUES = ['0.25', '0.5', '0.75', '1', '2', '4', '6', '8'];

export function XPMultiplier({ multiplier, setMultiplier }) {
  return (
    <SectionCard
      icon={TrendingUp}
      iconBgColor="bg-indigo-500/20"
      iconColor="text-indigo-400"
      title="Multiplicador de XP"
      description="Ajusta la velocidad de progresión de niveles en tu servidor"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MULTIPLIER_VALUES.map(val => (
          <button
            key={val}
            onClick={() => setMultiplier(val)}
            className={`px-4 py-3 rounded-lg font-medium transition-all border-2 ${
              multiplier === val
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-indigo-500/50'
            }`}
          >
            {val}x
          </button>
        ))}
      </div>
    </SectionCard>
  );
}