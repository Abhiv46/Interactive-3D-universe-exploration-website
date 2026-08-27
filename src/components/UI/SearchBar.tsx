import { useState, useEffect, useRef } from 'react';
import { searchCatalog, getObjectById, SearchResult, CELESTIAL_TYPES } from '@/data';

interface SearchBarProps {
  onSelect: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: any;
  }) => void;
}

import * as THREE from 'three';

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Search on query change (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (query.trim().length >= 2) {
        const searchResults = await searchCatalog(query.trim());
        setResults(searchResults.slice(0, 10));
        setIsOpen(true);
        setSelectedIndex(0);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          selectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const selectResult = async (result: SearchResult) => {
    // Get full object data
    const fullObject = await getObjectById(result.id);
    if (fullObject) {
      // We need to get the actual data object with position
      // This would need to be enhanced with actual catalog lookup
      onSelect({
        id: result.id,
        name: result.name,
        type: result.type,
        position: new THREE.Vector3(0, 0, 0), // Will be updated by the scene
        data: fullObject,
      });
    }
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleFocus = () => {
    if (query.trim().length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on results
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search objects... (e.g. Mars, Sirius, Andromeda)"
          className="search-input glass-input"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-results glass-panel" ref={resultsRef}>
          <div className="search-results-header">
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="search-results-list">
            {results.map((result, index) => (
              <button
                key={result.id}
                className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => selectResult(result)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="result-icon">{CELESTIAL_TYPES[result.type]?.icon || '🌌'}</span>
                <div className="result-info">
                  <span className="result-name">{result.name}</span>
                  <span className="result-type">{CELESTIAL_TYPES[result.type]?.label || result.type}</span>
                </div>
                {result.distance && (
                  <span className="result-distance">
                    {result.distance.toFixed(1)} ly
                  </span>
                )}
              </button>
            ))}
          </div>
          {results.length >= 10 && (
            <div className="search-results-footer">
              Showing top 10 results. Refine search for more.
            </div>
          )}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && (
        <div className="search-no-results glass-panel">
          No objects found for "{query}"
        </div>
      )}
    </div>
  );
}

// Quick search component for common objects
export function QuickSearchButtons({ onSelect }: { onSelect: (object: any) => void }) {
  const quickObjects = [
    { id: 'sun', name: 'Sun', type: 'star' as const },
    { id: 'mercury', name: 'Mercury', type: 'planet' as const },
    { id: 'venus', name: 'Venus', type: 'planet' as const },
    { id: 'earth', name: 'Earth', type: 'planet' as const },
    { id: 'mars', name: 'Mars', type: 'planet' as const },
    { id: 'jupiter', name: 'Jupiter', type: 'planet' as const },
    { id: 'saturn', name: 'Saturn', type: 'planet' as const },
    { id: 'uranus', name: 'Uranus', type: 'planet' as const },
    { id: 'neptune', name: 'Neptune', type: 'planet' as const },
    { id: 'sirius', name: 'Sirius', type: 'star' as const },
    { id: 'alpha_centauri', name: 'Alpha Centauri', type: 'star' as const },
    { id: 'm31', name: 'Andromeda', type: 'galaxy' as const },
  ];

  return (
    <div className="quick-search glass-panel">
      {quickObjects.map(obj => (
        <button
          key={obj.id}
          className="quick-search-btn"
          onClick={async () => {
            const result = await getObjectById(obj.id);
            if (result) {
              onSelect({
                id: result.id,
                name: result.name,
                type: result.type,
                position: new THREE.Vector3(0, 0, 0),
                data: result,
              });
            }
          }}
        >
          {CELESTIAL_TYPES[obj.type]?.icon} {obj.name}
        </button>
      ))}
    </div>
  );
}