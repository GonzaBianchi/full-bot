import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export function SearchableSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Seleccionar...', 
  renderOption,
  renderSelected,
  icon: Icon,
  emptyMessage = 'No se encontraron resultados'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    
    if (typeof opt === 'string') {
      return opt.toLowerCase().includes(searchLower);
    }
    
    if (opt.name) {
      return opt.name.toLowerCase().includes(searchLower);
    }
    
    if (opt.label) {
      return opt.label.toLowerCase().includes(searchLower);
    }
    
    return true;
  });

  const selectedOption = options.find(opt => {
    if (typeof opt === 'string') return opt === value;
    return opt.id === value || opt.value === value;
  });

  const handleSelect = (option) => {
    const val = typeof option === 'string' ? option : (option.id || option.value);
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-gray-700/50 border-2 rounded-lg text-white cursor-pointer transition-all flex items-center justify-between ${
          isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-gray-600'
        }`}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {Icon && <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />}
          <span className={`truncate ${!value ? 'text-gray-400' : 'text-white'}`}>
            {value ? (
              renderSelected ? renderSelected(selectedOption) : (
                typeof selectedOption === 'string' ? selectedOption : (selectedOption?.name || selectedOption?.label || value)
              )
            ) : placeholder}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {value && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-600 rounded transition-colors"
              type="button"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border-2 border-indigo-500 rounded-lg shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, idx) => {
                const optValue = typeof option === 'string' ? option : (option.id || option.value);
                const isSelected = optValue === value;

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(option)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-indigo-600 text-white' 
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {renderOption ? renderOption(option, isSelected) : (
                      typeof option === 'string' ? option : (option.name || option.label || optValue)
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}