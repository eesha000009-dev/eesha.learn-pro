'use client';

import React, { useState } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { circuitTemplates } from '@/lib/templates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Search,
  Star,
  Zap,
  Monitor,
  Cpu,
  Lightbulb,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface TemplateGalleryProps {
  className?: string;
}

const difficultyStars = (d: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`h-3 w-3 ${i < d ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`}
    />
  ));

const categoryIcons: Record<string, React.ReactNode> = {
  beginner: <Zap className="h-4 w-4 text-emerald-400" />,
  intermediate: <Cpu className="h-4 w-4 text-amber-400" />,
  advanced: <Monitor className="h-4 w-4 text-rose-400" />,
};

const categoryColors: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export function TemplateGallery({ className = '' }: TemplateGalleryProps) {
  const { addTab, setActiveTab, addComponent, clearComponents, closeTab, editorTabs } =
    useSimulatorStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = circuitTemplates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLoadTemplate = (template: typeof circuitTemplates[0]) => {
    // Clear existing tabs
    editorTabs.forEach((tab) => closeTab(tab.id));
    clearComponents();

    // Add the sketch tab
    const sketchTab = {
      id: `sketch-${template.id}`,
      name: `${template.name}.ino`,
      language: 'c' as const,
      content: template.code,
      modified: false,
    };
    addTab(sketchTab);
    setActiveTab(sketchTab.id);

    // Add circuit code tab
    const circuitTab = {
      id: `circuit-${template.id}`,
      name: `${template.name}.circuit.tsx`,
      language: 'circuit' as const,
      content: template.circuitCode,
      modified: false,
    };
    addTab(circuitTab);

    // Load components onto canvas
    template.components.forEach((comp) => {
      addComponent({ ...comp });
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 ${className}`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Templates</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Circuit Templates
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Choose a starter circuit to learn electronics. Each template includes pre-wired
            components and ready-to-run code.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              !selectedCategory
                ? 'bg-zinc-100 text-zinc-900 border-zinc-200'
                : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {['beginner', 'intermediate', 'advanced'].map((cat) => (
            <button
              key={cat}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedCategory === cat
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-200'
                  : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="group relative p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800 transition-all cursor-pointer"
              onClick={() => handleLoadTemplate(template)}
            >
              {/* Category badge */}
              <div className="flex items-center justify-between mb-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${categoryColors[template.category]}`}
                >
                  {categoryIcons[template.category]}
                  <span className="ml-1">{template.category}</span>
                </Badge>
                <div className="flex items-center gap-0.5">
                  {difficultyStars(template.difficulty)}
                </div>
              </div>

              {/* Name and description */}
              <h3 className="font-semibold text-sm text-zinc-200 mb-1 group-hover:text-emerald-400 transition-colors">
                {template.name}
              </h3>
              <p className="text-xs text-zinc-500 mb-3 line-clamp-2">
                {template.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {template.tags.slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[9px] bg-zinc-800 text-zinc-500 border-0 h-5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Load button */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">
                  {template.components.length} component{template.components.length > 1 ? 's' : ''}
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Load <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-zinc-600">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No templates found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
