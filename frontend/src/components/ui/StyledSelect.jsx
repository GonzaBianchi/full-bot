// frontend/src/components/ui/StyledSelect.jsx
import { ChevronDown } from 'lucide-react';

export function StyledSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Seleccionar...', 
  icon: Icon,
  disabled = false,
  className = ''
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-10 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white cursor-pointer transition-all appearance-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-500`}
        >
          <option value="" disabled className="bg-gray-800">
            {placeholder}
          </option>
          {options.map((option, idx) => (
            <option 
              key={idx} 
              value={typeof option === 'string' ? option : option.id}
              className="bg-gray-800 text-white py-2"
            >
              {typeof option === 'string' ? option : option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}