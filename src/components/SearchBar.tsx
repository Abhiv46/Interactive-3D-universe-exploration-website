import { useState, useRef, useEffect, useMemo, KeyboardEvent } from 'react';
import { CelestialBodyData } from '@/types/orbitalElements';
import {
  MERCURY, VENUS, EARTH, MARS, JUPITER, SATURN, URANUS, NEPTUNE,
  MOON, IO, EUROPA, GANYMEDE, CALLISTO, TITAN, ENCELADUS
} from '@/data/planets';
import { useCameraControls } from '@/hooks/useCameraControls';

const ALL_BODIES: CelestialBodyData[] = [
  MERCURY, VENUS, EARTH, MARS, JUPITER, SATURN, URANUS, NEPTUNE,
  MOON, IO, EUROPA, GANYMEDE, CALLISTO, TITAN, ENCELADUS
];

interface SearchBarProps {
  /** Callback when a body is selected */
  onSelect?: (body: CelestialBodyData) => void;
  /** Currently selected body */
  selectedBody?: CelestialBodyData | null;
}

export function SearchBar({ onSelect, selectedBody }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { flyTo } = useCameraControls();

  // Filter bodies based on query
  const filteredBodies = useMemo(() => {
    if (!query.trim()) return ALL_BODIES;
    const lowerQuery = query.toLowerCase();
    return ALL_BODIES.filter(body =>
      body.name.toLowerCase().includes(lowerQuery) ||
      body.id.toLowerCase().includes(lowerQuery) ||
      body.metadata.designations?.some(d => d.toLowerCase().includes(lowerQuery))
    );
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredBodies.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredBodies[selectedIndex]) {
          selectBody(filteredBodies[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        if (!showResults) {
          setShowResults(true);
        }
        break;
    }
  };

  const selectBody = (body: CelestialBodyData) => {
    setQuery(body.name);
    setShowResults(false);
    onSelect?.(body);
    // Fly camera to the selected body
    flyTo(body);
  };

  // Focus handling
  const handleFocus = () => {
    if (query.trim()) {
      setShowResults(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on results
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="search-bar-container">
      <div className="search-bar-wrapper">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search planets, moons... (Enter to fly)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
            setSelectedIndex(0);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              setShowResults(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {showResults && filteredBodies.length > 0 && (
        <div className="search-results" role="listbox">
          {filteredBodies.map((body, index) => (
            <div
              key={body.id}
              className={`search-result-item ${index === selectedIndex ? 'selected' : ''} ${selectedBody?.id === body.id ? 'active' : ''}`}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => selectBody(body)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="result-icon" style={{ backgroundColor: body.visual.baseColor }} />
              <div className="result-info">
                <span className="result-name">{body.name}</span>
                <span className="result-type">{body.type}</span>
              </div>
              {selectedBody?.id === body.id && (
                <span className="result-badge">Current</span>
              )}
            </div>
          ))}
        </div>
      )}

      {showResults && filteredBodies.length === 0 && query && (
        <div className="search-results empty">
          <span>No results for "{query}"</span>
        </div>
      )}
    </div>
  );
}