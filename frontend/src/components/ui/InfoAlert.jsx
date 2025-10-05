// frontend/src/components/ui/InfoAlert.jsx
import { AlertCircle } from 'lucide-react';

export function InfoAlert({ title, items, variant = 'blue' }) {
  const variants = {
    blue: {
      bg: 'bg-blue-500/10 border-blue-500/50',
      icon: 'text-blue-400',
      title: 'text-blue-300',
      text: 'text-blue-400/80'
    },
    yellow: {
      bg: 'bg-yellow-500/10 border-yellow-500/50',
      icon: 'text-yellow-400',
      title: 'text-yellow-300',
      text: 'text-yellow-400/80'
    }
  };

  const colors = variants[variant] || variants.blue;

  return (
    <div className={`${colors.bg} border rounded-lg p-4`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className={`w-5 h-5 ${colors.icon} mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <p className={`${colors.title} font-medium mb-1`}>{title}</p>
          <ul className={`${colors.text} text-sm space-y-1`}>
            {items.map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}