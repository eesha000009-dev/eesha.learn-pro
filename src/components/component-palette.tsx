'use client';

import React from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { componentLibrary, componentCategories } from '@/lib/components';
import type { CircuitComponent } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ComponentPaletteProps {
  className?: string;
}

export function ComponentPalette({ className = '' }: ComponentPaletteProps) {
  const { addComponent, setSelectedComponent, showComponentPanel } = useSimulatorStore();

  if (!showComponentPanel) return null;

  const handleAddComponent = (comp: typeof componentLibrary[0]) => {
    const newComp: CircuitComponent = {
      id: `${comp.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: comp.type,
      name: comp.name,
      x: 200 + Math.random() * 200,
      y: 150 + Math.random() * 150,
      rotation: 0,
      pins: comp.defaultPins.map((p) => ({ ...p })),
      props: comp.defaultProps ? { ...comp.defaultProps } : undefined,
    };
    addComponent(newComp);
    setSelectedComponent(newComp.id);
  };

  const categories = componentCategories.map((cat) => ({
    ...cat,
    components: componentLibrary.filter((c) => c.category === cat.id),
  }));

  return (
    <div className={`flex flex-col h-full bg-zinc-900 border-r border-zinc-800 ${className}`}>
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Components
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {categories.map((category) => (
            <div key={category.id}>
              <div className="flex items-center gap-2 px-1 mb-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${category.color}`} />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {category.name}
                </span>
                <Badge variant="secondary" className="text-[9px] h-3.5 px-1.5 bg-zinc-800 text-zinc-500 border-0">
                  {category.components.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {category.components.map((comp) => (
                  <button
                    key={`${comp.type}-${comp.name}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-md bg-zinc-800/50 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all group"
                    onClick={() => handleAddComponent(comp)}
                    title={comp.description}
                  >
                    <div className="text-zinc-400 group-hover:text-emerald-400 transition-colors">
                      {comp.icon}
                    </div>
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 text-center leading-tight transition-colors">
                      {comp.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
