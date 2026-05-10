'use client';

import React, { useCallback, useState } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { COMPONENT_DEFINITIONS, COMPONENT_CATEGORIES } from '@/lib/component-defs';

export function ComponentPalette() {
  const { showPalette, togglePalette, addComponent } = useSimulatorStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddComponent = useCallback(
    (defId: string) => {
      const def = COMPONENT_DEFINITIONS.find((d) => d.type === defId);
      if (!def) return;
      // Place in the workspace with some offset
      const offset = Math.random() * 100 - 50;
      addComponent(defId, def.defaultX + offset, def.defaultY + offset);
    },
    [addComponent]
  );

  if (!showPalette) return null;

  // ─── Build categorized list ────────────────────────────────────────────
  const categories = COMPONENT_CATEGORIES.map((cat) => ({
    ...cat,
    components: COMPONENT_DEFINITIONS.filter((c) => c.category === cat.id),
  })).filter((cat) => cat.components.length > 0);

  // ─── Search filtering ──────────────────────────────────────────────────
  const query = searchQuery.trim().toLowerCase();
  const isSearching = query.length > 0;

  const searchResults = isSearching
    ? COMPONENT_DEFINITIONS.filter((c) => c.name.toLowerCase().includes(query))
    : null;

  return (
    <div className="w-60 bg-white border-r border-[#E9ECEF] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E9ECEF] shrink-0">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Components</h3>
        <button
          onClick={togglePalette}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Search input */}
      <div className="px-3 py-2 border-b border-[#E9ECEF] shrink-0">
        <div className="relative">
          {/* Search icon */}
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/20 transition-all"
          />
          {/* Clear button when search is active */}
          {searchQuery.length > 0 && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          searchResults && searchResults.length > 0 ? (
            <div className="px-2 py-2 space-y-0.5">
              {searchResults.map((comp) => {
                const cat = COMPONENT_CATEGORIES.find((c) => c.id === comp.category);
                return (
                  <button
                    key={comp.type}
                    onClick={() => handleAddComponent(comp.type)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all group"
                  >
                    <span className="text-base shrink-0">{cat?.icon ?? '📦'}</span>
                    <div className="min-w-0">
                      <div className="font-medium truncate group-hover:text-gray-900">{comp.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{comp.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-xs text-gray-400">No components found for</p>
              <p className="text-xs text-gray-300 font-mono mt-0.5">&quot;{searchQuery}&quot;</p>
            </div>
          )
        ) : (
          categories.map((cat) => (
            <div key={cat.id}>
              <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50 sticky top-0">
                {cat.name}
              </div>
              <div className="px-2 pb-2 space-y-0.5">
                {cat.components.map((comp) => (
                  <button
                    key={comp.type}
                    onClick={() => handleAddComponent(comp.type)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all group"
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <div className="font-medium truncate group-hover:text-gray-900">{comp.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{comp.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
