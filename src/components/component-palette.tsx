'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  ChevronDown,
  Cpu,
  Zap,
  MousePointer,
  Lightbulb,
  Monitor,
  Settings,
  Eye,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { componentLibrary, componentCategories } from '@/lib/components';
import type { ComponentDefinition } from '@/lib/components';
import { useSimulatorStore } from '@/store/simulator-store';
import type { CircuitComponent } from '@/types';

/* ── Category visual config (module-level, stable) ── */

const CATEGORY_CONFIG = {
  board:   { Icon: Cpu,        border: 'border-l-amber-500',  text: 'text-amber-400' },
  basic:   { Icon: Zap,        border: 'border-l-emerald-500', text: 'text-emerald-400' },
  input:   { Icon: MousePointer, border: 'border-l-sky-500',   text: 'text-sky-400' },
  output:  { Icon: Lightbulb,  border: 'border-l-rose-500',   text: 'text-rose-400' },
  display: { Icon: Monitor,    border: 'border-l-violet-500', text: 'text-violet-400' },
  motor:   { Icon: Settings,   border: 'border-l-orange-500', text: 'text-orange-400' },
  sensor:  { Icon: Eye,        border: 'border-l-teal-500',   text: 'text-teal-400' },
} as const;

type CategoryId = keyof typeof CATEGORY_CONFIG;

/* ── Module-level sub-components (avoids static-components lint) ── */

function ComponentCard({
  comp,
  onAdd,
}: {
  comp: ComponentDefinition;
  onAdd: (comp: ComponentDefinition) => void;
}) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/component-type', comp.type);
      e.dataTransfer.setData('application/component-name', comp.name);
      e.dataTransfer.setData(
        'application/component-data',
        JSON.stringify({
          type: comp.type,
          name: comp.name,
          defaultPins: comp.defaultPins,
          defaultProps: comp.defaultProps,
        }),
      );
      e.dataTransfer.effectAllowed = 'copy';
    },
    [comp.type, comp.name, comp.defaultPins, comp.defaultProps],
  );

  return (
    <button
      className="group relative flex flex-col items-center gap-1 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/80 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-150 cursor-pointer text-left"
      onClick={() => onAdd(comp)}
      draggable
      onDragStart={handleDragStart}
      title={`${comp.name}\n${comp.description}\n\nClick to add or drag to canvas`}
    >
      <div className="text-zinc-500 group-hover:text-emerald-400 transition-colors duration-150">
        {comp.icon}
      </div>
      <span className="text-[10px] font-medium text-zinc-500 group-hover:text-zinc-300 text-center leading-tight transition-colors duration-150">
        {comp.name}
      </span>
      <span className="text-[9px] text-zinc-600 group-hover:text-zinc-500 text-center leading-tight line-clamp-1 transition-colors duration-150 max-w-full">
        {comp.description}
      </span>
    </button>
  );
}

function CategorySection({
  categoryId,
  categoryName,
  components,
  isExpanded,
  onToggle,
  onAddComponent,
  borderColor,
  textColor,
}: {
  categoryId: string;
  categoryName: string;
  components: ComponentDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
  onAddComponent: (comp: ComponentDefinition) => void;
  borderColor: string;
  textColor: string;
}) {
  const config = CATEGORY_CONFIG[categoryId as CategoryId];
  const CatIcon = config?.Icon ?? Zap;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800/60 transition-colors">
        <ChevronDown
          className={`h-3 w-3 text-zinc-500 transition-transform duration-200 ${
            isExpanded ? '' : '-rotate-90'
          }`}
        />
        <div className={`rounded p-0.5 ${textColor}`}>
          <CatIcon className="h-3 w-3" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex-1 text-left">
          {categoryName}
        </span>
        <Badge
          variant="secondary"
          className="text-[9px] h-4 min-w-4 px-1.5 bg-zinc-800 text-zinc-500 border-0 justify-center"
        >
          {components.length}
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent className="collapsible-content overflow-hidden">
        <div className={`border-l-2 ${borderColor} ml-2 pl-2 pt-1 pb-1`}>
          <div className="grid grid-cols-2 gap-1">
            {components.map((comp) => (
              <ComponentCard
                key={`${comp.type}-${comp.name}`}
                comp={comp}
                onAdd={onAddComponent}
              />
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── Main exported component ── */

interface ComponentPaletteProps {
  className?: string;
}

export function ComponentPalette({ className = '' }: ComponentPaletteProps) {
  const { addComponent, setSelectedComponent, showComponentPanel } =
    useSimulatorStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* Keyboard shortcut: Ctrl+K or / to focus search */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!showComponentPanel) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(
          (e.target as HTMLElement)?.tagName ?? '',
        )
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showComponentPanel]);

  /* Filter components by search query */
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return componentCategories
      .map((cat) => ({
        ...cat,
        components: componentLibrary.filter((c) => {
          if (c.category !== cat.id) return false;
          if (!query) return true;
          return (
            c.name.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query) ||
            cat.name.toLowerCase().includes(query)
          );
        }),
      }))
      .filter((cat) => cat.components.length > 0);
  }, [searchQuery]);

  const totalFiltered = useMemo(
    () => filteredCategories.reduce((sum, cat) => sum + cat.components.length, 0),
    [filteredCategories],
  );

  /* Add component to canvas at center with small random offset */
  const handleAddComponent = useCallback(
    (comp: ComponentDefinition) => {
      const newComp: CircuitComponent = {
        id: `${comp.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: comp.type,
        name: comp.name,
        x: 350 + (Math.random() - 0.5) * 60,
        y: 200 + (Math.random() - 0.5) * 60,
        rotation: 0,
        pins: comp.defaultPins.map((p) => ({ ...p })),
        props: comp.defaultProps ? { ...comp.defaultProps } : undefined,
      };
      addComponent(newComp);
      setSelectedComponent(newComp.id);
    },
    [addComponent, setSelectedComponent],
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  if (!showComponentPanel) return null;

  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${className}`}>
      {/* ── Header ── */}
      <div className="px-3 py-2.5 border-b border-zinc-800 shrink-0">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Components
        </h3>
      </div>

      {/* ── Search bar ── */}
      <div className="px-2 py-2 border-b border-zinc-800/60 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs bg-zinc-800/60 border-zinc-700/50 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/40 placeholder:text-zinc-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Stats row + keyboard hint */}
        <div className="flex items-center justify-between mt-1.5 px-0.5">
          <span className="text-[10px] text-zinc-600">
            {searchQuery
              ? `${totalFiltered} result${totalFiltered !== 1 ? 's' : ''}`
              : `${componentLibrary.length} components`}
          </span>
          <span className="text-[10px] text-zinc-600 hidden sm:inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[9px] border border-zinc-700/50">
              Ctrl+K
            </kbd>
            <span>to search</span>
          </span>
        </div>
      </div>

      {/* ── Component list ── */}
      <ScrollArea className="flex-1">
        {totalFiltered === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-12 w-12 rounded-full bg-zinc-800/80 flex items-center justify-center mb-4">
              <Search className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 font-medium">
              No components found
            </p>
            <p className="text-xs text-zinc-600 mt-1 mb-4">
              Try a different search term
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors px-3 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/15"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Category accordion list */
          <div className="p-2 space-y-0.5">
            {filteredCategories.map((category, idx) => {
              const config = CATEGORY_CONFIG[category.id as CategoryId];
              if (!config) return null;

              const isSearching = searchQuery.length > 0;
              const isExpanded =
                isSearching || !collapsedCategories[category.id];

              return (
                <div key={category.id}>
                  {idx > 0 && (
                    <Separator className="my-1.5 bg-zinc-800/80" />
                  )}
                  <CategorySection
                    categoryId={category.id}
                    categoryName={category.name}
                    components={category.components}
                    isExpanded={isExpanded}
                    onToggle={() => toggleCategory(category.id)}
                    onAddComponent={handleAddComponent}
                    borderColor={config.border}
                    textColor={config.text}
                  />
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
