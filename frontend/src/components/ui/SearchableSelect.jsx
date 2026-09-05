// frontend/src/components/ui/SearchableSelect.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const valueOf = (option) =>
  typeof option === 'string' ? option : (option.id ?? option.value);

const labelOf = (option) =>
  typeof option === 'string' ? option : (option.name ?? option.label ?? valueOf(option));

export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  renderOption,
  renderSelected,
  icon: Icon,
  emptyMessage = 'No se encontraron resultados',
  label
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useRef(`listbox-${Math.random().toString(36).slice(2)}`).current;

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(option => String(labelOf(option)).toLowerCase().includes(term));
  }, [options, search]);

  const selectedOption = options.find(option => valueOf(option) === value);

  const close = ({ focusTrigger = false } = {}) => {
    setIsOpen(false);
    setSearch('');
    setActiveIndex(0);
    if (focusTrigger) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) close();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Mantiene visible la opción resaltada al moverse con las flechas.
  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const handleSelect = (option) => {
    onChange(valueOf(option));
    close({ focusTrigger: true });
  };

  const handleClear = (event) => {
    event.stopPropagation();
    onChange('');
    setSearch('');
  };

  const handleKeyDown = (event) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close({ focusTrigger: true });
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(index => Math.min(index + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(index => Math.max(index - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(filteredOptions.length - 1);
        break;
      case 'Enter': {
        event.preventDefault();
        const option = filteredOptions[activeIndex];
        if (option) handleSelect(option);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative ${isOpen ? 'z-50' : 'z-10'}`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={label}
        className={`w-full px-4 py-3 bg-gray-700/50 border-2 rounded-lg text-white cursor-pointer transition-all flex items-center justify-between ${
          isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-gray-600'
        }`}
      >
        <span className="flex items-center space-x-2 flex-1 min-w-0">
          {Icon && <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />}
          <span className={`truncate text-left ${value ? 'text-white' : 'text-gray-400'}`}>
            {value
              ? (renderSelected ? renderSelected(selectedOption) : labelOf(selectedOption ?? value))
              : placeholder}
          </span>
        </span>

        <span className="flex items-center space-x-2">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Quitar la selección"
              onClick={handleClear}
              className="p-1 hover:bg-gray-600 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border-2 border-indigo-500 rounded-lg shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-700 bg-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Buscar..."
                aria-label="Filtrar opciones"
                autoFocus
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div ref={listRef} role="listbox" id={listboxId} className="max-h-64 overflow-y-auto bg-gray-800">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-8 text-center text-gray-400 text-sm">{emptyMessage}</p>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue = valueOf(option);
                const isSelected = optionValue === value;
                const isActive = index === activeIndex;

                return (
                  <div
                    key={optionValue ?? index}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(option)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : isActive
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-300'
                    }`}
                  >
                    {renderOption ? renderOption(option, isSelected) : labelOf(option)}
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
