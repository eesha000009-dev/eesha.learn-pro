'use client';

import React, { useCallback } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { COMPONENT_DEFINITIONS, COMPONENT_CATEGORIES } from '@/lib/component-defs';

export function ComponentPalette() {
  const { showPalette, togglePalette, addComponent } = useSimulatorStore();

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

  const categories = COMPONENT_CATEGORIES.map((cat) => ({
    ...cat,
    components: COMPONENT_DEFINITIONS.filter((c) => c.category === cat.id),
  })).filter((cat) => cat.components.length > 0);

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

      {/* Search */}
      <div className="px-3 py-2 border-b border-zinc-800 shrink-0">
        <input
          type="text"
          placeholder="Search components..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {categories.map((cat) => (
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
        ))}
      </div>
    </div>
  );
}
