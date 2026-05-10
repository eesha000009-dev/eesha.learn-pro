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

  // When searching, flatten all components and filter by name (case-insensitive)
  const searchResults = isSearching
    ? COMPONENT_DEFINITIONS.filter((c) => c.name.toLowerCase().includes(query))
    : null;

  return (
    <div className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800 shrink-0">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Components</h3>
        <button
          onClick={togglePalette}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Search input */}
      <div className="px-3 py-2 border-b border-zinc-800 shrink-0">
        <div className="relative">
          {/* Search icon */}
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
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
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
          {/* Clear button when search is active */}
          {searchQuery.length > 0 && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
          /* ── Search results: flat list ──────────────────────────────────── */
          searchResults && searchResults.length > 0 ? (
            <div className="px-2 py-2 space-y-0.5">
              {searchResults.map((comp) => {
                // Find the category icon for this component
                const cat = COMPONENT_CATEGORIES.find((c) => c.id === comp.category);
                return (
                  <button
                    key={comp.type}
                    onClick={() => handleAddComponent(comp.type)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all group"
                  >
                    <span className="text-base shrink-0">{cat?.icon ?? '📦'}</span>
                    <div className="min-w-0">
                      <div className="font-medium truncate group-hover:text-zinc-100">
                        {/* Highlight matching text */}
                        {comp.name}
                      </div>
                      <div className="text-[10px] text-zinc-600 truncate">{comp.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── No results ──────────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700 mb-2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-xs text-zinc-600">No components found for</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">&quot;{searchQuery}&quot;</p>
            </div>
          )
        ) : (
          /* ── Default categorized view ──────────────────────────────────── */
          categories.map((cat) => (
            <div key={cat.id}>
              <div className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/50 sticky top-0">
                {cat.name}
              </div>
              <div className="px-2 pb-2 space-y-0.5">
                {cat.components.map((comp) => (
                  <button
                    key={comp.type}
                    onClick={() => handleAddComponent(comp.type)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all group"
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <div className="font-medium truncate group-hover:text-zinc-100">{comp.name}</div>
                      <div className="text-[10px] text-zinc-600 truncate">{comp.description}</div>
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
