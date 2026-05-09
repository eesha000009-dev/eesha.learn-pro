'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import type { CircuitComponent, PinState, ComponentType } from '@/types';
import { componentLibrary, componentCategories } from '@/lib/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  MousePointerClick,
  Trash2,
  Copy,
  RotateCw,
  RotateCcw,
  ArrowUpToLine,
  ArrowDownToLine,
  Move,
  Zap,
  Lightbulb,
  Cpu,
  Monitor,
  Keyboard,
  CircuitBoard,
  Wifi,
  Microchip,
  CpuIcon,
  Crosshair,
  Activity,
  Thermometer,
  Gauge,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Category helpers                                                          */
/* -------------------------------------------------------------------------- */

const categoryColorMap: Record<string, string> = {
  board: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  basic: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  input: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  output: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  display: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  motor: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  sensor: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
};

function getCategoryBadge(type: ComponentType): { label: string; className: string } {
  const def = componentLibrary.find((d) => d.type === type);
  const cat = def?.category ?? 'basic';
  const catDef = componentCategories.find((c) => c.id === cat);
  return {
    label: catDef?.name ?? cat,
    className: categoryColorMap[cat] ?? categoryColorMap.basic,
  };
}

function getComponentIcon(type: ComponentType): React.ReactNode {
  const def = componentLibrary.find((d) => d.type === type);
  if (def) return <span className="text-zinc-300">{def.icon}</span>;
  return <CircuitBoard className="h-5 w-5 text-zinc-400" />;
}

/* -------------------------------------------------------------------------- */
/*  Pin state dot                                                             */
/* -------------------------------------------------------------------------- */

function PinStateDot({ value }: { value: PinState['value'] }) {
  if (value === 'high') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
      </span>
    );
  }
  if (value === 'low') {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-600" />;
  }
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-amber-400 opacity-50" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pin row                                                                   */
/* -------------------------------------------------------------------------- */

function PinRow({
  pin,
  isRunning,
  index,
}: {
  pin: PinState;
  isRunning: boolean;
  index: number;
}) {
  const stateLabel = pin.value.toUpperCase();
  const stateColor =
    pin.value === 'high'
      ? 'text-emerald-400'
      : pin.value === 'low'
        ? 'text-zinc-500'
        : 'text-amber-400';

  return (
    <div
      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
        isRunning && pin.value === 'high'
          ? 'bg-emerald-500/8 ring-1 ring-emerald-500/15'
          : 'bg-zinc-800/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-zinc-600 font-mono text-[10px] w-5 shrink-0">
          #{pin.pinNumber}
        </span>
        <span className="text-zinc-300 font-medium truncate max-w-[80px]">
          {pin.pinName}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        {pin.voltage !== undefined && (
          <span className="text-zinc-500 font-mono text-[10px] tabular-nums">
            {pin.voltage.toFixed(1)}V
          </span>
        )}
        <span className={`font-semibold text-[10px] uppercase tracking-wide ${stateColor}`}>
          {stateLabel}
        </span>
        <PinStateDot value={pin.value} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section header                                                            */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        {title}
      </span>
      {badge}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Property editor helpers                                                   */
/* -------------------------------------------------------------------------- */

function ResistanceInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const displayValue = value >= 1_000_000
    ? (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)
    : value >= 1_000
      ? (value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)
      : value.toString();

  const suffix = value >= 1_000_000 ? ' MΩ' : value >= 1_000 ? ' kΩ' : ' Ω';

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim();
      if (raw === '') return;
      let num = parseFloat(raw);
      if (isNaN(num) || num < 0) return;
      if (raw.toLowerCase().endsWith('m')) num *= 1_000_000;
      else if (raw.toLowerCase().endsWith('k')) num *= 1_000;
      else if (raw.endsWith('Ω')) num = num;
      onChange(Math.round(num));
    },
    [onChange],
  );

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="text"
          defaultValue={`${displayValue}${suffix}`}
          onBlur={handleInput}
          className="h-7 text-xs font-mono bg-zinc-800/80 border-zinc-700/60 text-zinc-300 pr-8 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 pointer-events-none">
          Ω
        </span>
      </div>
    </div>
  );
}

function CapacitanceInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const displayValue = value >= 1_000_000
    ? (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)
    : value >= 1_000
      ? (value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)
      : value.toString();

  const suffix = value >= 1_000_000 ? ' mF' : value >= 1_000 ? ' nF' : ' µF';

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim();
      if (raw === '') return;
      let num = parseFloat(raw);
      if (isNaN(num) || num < 0) return;
      if (raw.toLowerCase().includes('mf')) num *= 1_000_000;
      else if (raw.toLowerCase().includes('nf')) num *= 1_000;
      onChange(Math.round(num));
    },
    [onChange],
  );

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
        {label}
      </Label>
      <div className="relative">
        <Input
          type="text"
          defaultValue={`${displayValue}${suffix}`}
          onBlur={handleInput}
          className="h-7 text-xs font-mono bg-zinc-800/80 border-zinc-700/60 text-zinc-300 pr-10 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 pointer-events-none">
          µF
        </span>
      </div>
    </div>
  );
}

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-9 rounded-md border border-zinc-700/60 bg-transparent cursor-pointer p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none"
          />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs font-mono bg-zinc-800/80 border-zinc-700/60 text-zinc-300 flex-1 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
        />
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  label,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
        {label}
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-7 text-xs font-mono bg-zinc-800/80 border-zinc-700/60 text-zinc-300 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Property editor by component type                                         */
/* -------------------------------------------------------------------------- */

function PropertiesPanel({ component }: { component: CircuitComponent }) {
  const { updateComponent } = useSimulatorStore();
  const props = component.props ?? {};

  const updateProp = useCallback(
    (key: string, value: unknown) => {
      updateComponent(component.id, {
        props: { ...props, [key]: value },
      });
    },
    [component.id, props, updateComponent],
  );

  switch (component.type) {
    case 'resistor':
      return (
        <ResistanceInput
          label="Resistance"
          value={props.resistance ?? 220}
          onChange={(v) => updateProp('resistance', v)}
        />
      );

    case 'led':
      return (
        <ColorInput
          label="Color"
          value={props.color ?? '#ef4444'}
          onChange={(v) => updateProp('color', v)}
        />
      );

    case 'rgb_led':
      return (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-600 italic">RGB LED — channels controlled via pins</p>
        </div>
      );

    case 'capacitor':
      return (
        <CapacitanceInput
          label="Capacitance"
          value={props.capacitance ?? 100}
          onChange={(v) => updateProp('capacitance', v)}
        />
      );

    case 'potentiometer':
      return (
        <ResistanceInput
          label="Max Resistance"
          value={props.resistance ?? 10000}
          onChange={(v) => updateProp('resistance', v)}
        />
      );

    case 'servo':
      return (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Min Angle"
            value={props.minAngle ?? 0}
            onChange={(v) => updateProp('minAngle', v)}
            min={0}
            max={360}
          />
          <NumberInput
            label="Max Angle"
            value={props.maxAngle ?? 180}
            onChange={(v) => updateProp('maxAngle', v)}
            min={0}
            max={360}
          />
        </div>
      );

    case 'lcd':
      return (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Rows"
            value={props.rows ?? 2}
            onChange={(v) => updateProp('rows', v)}
            min={1}
            max={4}
          />
          <NumberInput
            label="Columns"
            value={props.cols ?? 16}
            onChange={(v) => updateProp('cols', v)}
            min={8}
            max={40}
          />
        </div>
      );

    case 'battery':
      return (
        <NumberInput
          label="Voltage"
          value={props.voltage ?? 9}
          onChange={(v) => updateProp('voltage', v)}
          min={0}
          max={48}
          step={0.1}
        />
      );

    case 'seven_segment':
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={props.commonCathode !== false}
              onChange={(e) => updateProp('commonCathode', e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
            />
            Common Cathode
          </label>
        </div>
      );

    default:
      return (
        <div className="space-y-1.5">
          {Object.entries(props).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-0.5">
              <span className="text-[10px] text-zinc-500">{key}</span>
              <span className="text-xs text-zinc-300 font-mono">
                {typeof value === 'number'
                  ? key.includes('resistance')
                    ? `${value}Ω`
                    : key.includes('capacitance')
                      ? `${value}µF`
                      : key.includes('voltage')
                        ? `${value}V`
                        : String(value)
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Rotation quick button                                                     */
/* -------------------------------------------------------------------------- */

function RotationButton({
  angle,
  current,
  onClick,
}: {
  angle: number;
  current: number;
  onClick: () => void;
}) {
  const isActive = current === angle;
  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="icon-xs"
      onClick={onClick}
      className={
        isActive
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
          : 'border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
      }
    >
      {angle}°
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                               */
/* -------------------------------------------------------------------------- */

function EmptyState() {
  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
        <Cpu className="h-4 w-4 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Inspector
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <MousePointerClick className="h-7 w-7 text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-1">
              No component selected
            </p>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-[200px]">
              Select a component to inspect its properties
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 font-mono">
              Click
            </kbd>
            <span className="text-[10px] text-zinc-600">on canvas</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Main ComponentInspector                                                   */
/* ========================================================================== */

export function ComponentInspector() {
  const {
    selectedComponentId,
    components,
    updateComponent,
    removeComponent,
    addComponent,
    setSelectedComponent,
    simulation,
    showGrid,
  } = useSimulatorStore();

  const [nameEditing, setNameEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  const component = useMemo(
    () => components.find((c) => c.id === selectedComponentId) ?? null,
    [components, selectedComponentId],
  );

  /* ---- Duplicate handler ---- */
  const handleDuplicate = useCallback(() => {
    if (!component) return;
    const dup: CircuitComponent = {
      ...component,
      id: `${component.type}-${Date.now()}`,
      name: `${component.name} (copy)`,
      x: component.x + 30,
      y: component.y + 30,
      pins: component.pins.map((p) => ({ ...p })),
      props: component.props ? { ...component.props } : undefined,
    };
    addComponent(dup);
  }, [component, addComponent]);

  /* ---- Reorder handlers ---- */
  const handleBringToFront = useCallback(() => {
    if (!component) return;
    const idx = components.findIndex((c) => c.id === component.id);
    if (idx < 0 || idx === components.length - 1) return;
    const arr = [...components];
    const [item] = arr.splice(idx, 1);
    arr.push(item);
    // Rebuild via remove+add (store doesn't have reorder)
    removeComponent(component.id);
    addComponent(item);
  }, [component, components, removeComponent, addComponent]);

  const handleSendToBack = useCallback(() => {
    if (!component) return;
    const idx = components.findIndex((c) => c.id === component.id);
    if (idx <= 0) return;
    const arr = [...components];
    const [item] = arr.splice(idx, 1);
    arr.unshift(item);
    removeComponent(component.id);
    addComponent(item);
  }, [component, components, removeComponent, addComponent]);

  /* ---- Delete handler ---- */
  const handleDelete = useCallback(() => {
    if (!component) return;
    removeComponent(component.id);
    setSelectedComponent(null);
  }, [component, removeComponent, setSelectedComponent]);

  /* ---- Center on canvas ---- */
  const handleCenter = useCallback(() => {
    if (!component) return;
    updateComponent(component.id, { x: 400, y: 300 });
  }, [component, updateComponent]);

  /* ---- Snap to grid ---- */
  const gridSize = showGrid ? 20 : 1;

  const snapAndUpdate = useCallback(
    (field: 'x' | 'y', value: number) => {
      if (!component) return;
      const snapped = Math.round(value / gridSize) * gridSize;
      updateComponent(component.id, { [field]: snapped });
    },
    [component, updateComponent, gridSize],
  );

  /* ---- Name editing hooks (must be before early return) ---- */
  const startNameEdit = useCallback(() => {
    if (!component) return;
    setDraftName(component.name);
    setNameEditing(true);
  }, [component]);

  const commitName = useCallback(() => {
    setNameEditing(false);
    if (!component) return;
    if (draftName.trim() && draftName.trim() !== component.name) {
      updateComponent(component.id, { name: draftName.trim() });
    }
  }, [draftName, component, updateComponent]);

  /* ---- Pin state summary for power estimate ---- */
  const powerEstimate = useMemo(() => {
    if (!component || !simulation.isRunning) return null;
    const pins = simulation.pinStates[component.id] ?? component.pins;
    const highPins = pins.filter((p) => p.value === 'high').length;
    // Very rough estimate: 5V * 2mA per active pin
    const current = highPins * 0.002;
    const power = 5 * current * 1000; // mW
    return { highPins, current: (current * 1000).toFixed(1), power: power.toFixed(2) };
  }, [component, simulation]);

  /* ---- Empty state ---- */
  if (!component) return <EmptyState />;

  const cat = getCategoryBadge(component.type);
  const isRunning = simulation.isRunning;

  /* ========================================================================== */

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
        <Cpu className="h-4 w-4 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Inspector
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* ---- Component Header Card ---- */}
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/80 overflow-hidden">
            <div className="px-3 py-2.5 bg-zinc-900 flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-zinc-800/80 border border-zinc-700/40">
                {getComponentIcon(component.type)}
              </div>
              <div className="flex-1 min-w-0">
                {nameEditing ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitName();
                      if (e.key === 'Escape') setNameEditing(false);
                    }}
                    className="w-full text-sm font-semibold text-zinc-200 bg-zinc-800 border border-emerald-500/40 rounded px-1.5 py-0.5 outline-none focus:border-emerald-500/70"
                  />
                ) : (
                  <button
                    onClick={startNameEdit}
                    className="text-sm font-semibold text-zinc-200 truncate block w-full text-left hover:text-emerald-400 transition-colors cursor-text"
                    title="Click to rename"
                  >
                    {component.name}
                  </button>
                )}
                <p className="text-[10px] text-zinc-600 font-mono truncate">
                  {component.id}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] border px-1.5 py-0 ${cat.className}`}
              >
                {cat.label}
              </Badge>
            </div>
          </div>

          <Separator className="bg-zinc-800/60" />

          {/* ---- Pin State Panel ---- */}
          {component.pins.length > 0 && (
            <div>
              <SectionHeader
                icon={Zap}
                title="Pin States"
                badge={
                  isRunning ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      LIVE
                    </span>
                  ) : undefined
                }
              />
              <div className="space-y-1">
                {component.pins.map((pin, i) => (
                  <PinRow
                    key={pin.pinNumber}
                    pin={pin}
                    isRunning={isRunning}
                    index={i}
                  />
                ))}
              </div>
              {/* Pin summary */}
              <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-600">
                <span>{component.pins.length} pins</span>
                <span>·</span>
                <span>
                  {component.pins.filter((p) => p.value === 'high').length} HIGH
                </span>
                <span>·</span>
                <span>
                  {component.pins.filter((p) => p.value === 'low').length} LOW
                </span>
                {component.pins.some((p) => p.value === 'floating') && (
                  <>
                    <span>·</span>
                    <span className="text-amber-500/80">
                      {component.pins.filter((p) => p.value === 'floating').length} FLT
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <Separator className="bg-zinc-800/60" />

          {/* ---- Properties Panel ---- */}
          <div>
            <SectionHeader icon={Lightbulb} title="Properties" />
            <div className="space-y-2">
              <PropertiesPanel component={component} />
            </div>
          </div>

          <Separator className="bg-zinc-800/60" />

          {/* ---- Position Panel ---- */}
          <div>
            <SectionHeader icon={Crosshair} title="Position" />
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  X
                </Label>
                <Input
                  type="number"
                  value={component.x}
                  onChange={(e) => snapAndUpdate('x', Number(e.target.value))}
                  className="h-7 text-xs font-mono bg-zinc-800/80 border-zinc-700/60 text-zinc-300 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  Y
                </Label>
                <Input
                  type="number"
                  value={component.y}
                  onChange={(e) => snapAndUpdate('y', Number(e.target.value))}
                  className="h-7 text-xs font-mono bg-zinc-800/80 border-zinc-700/60 text-zinc-300 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Rotation */}
            <Label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5 block">
              Rotation
            </Label>
            <div className="flex items-center gap-1.5 mb-2.5">
              {[0, 90, 180, 270].map((angle) => (
                <RotationButton
                  key={angle}
                  angle={angle}
                  current={component.rotation}
                  onClick={() =>
                    updateComponent(component.id, { rotation: angle })
                  }
                />
              ))}
              <div className="w-px h-4 bg-zinc-700/60 mx-1" />
              <Input
                type="number"
                value={component.rotation}
                onChange={(e) =>
                  updateComponent(component.id, {
                    rotation: Number(e.target.value) % 360,
                  })
                }
                className="h-7 w-14 text-xs font-mono bg-zinc-800/80 border-zinc-700/60 text-zinc-300 text-center focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
              />
              <span className="text-[10px] text-zinc-600">°</span>
            </div>

            {/* Center on canvas */}
            <Button
              variant="outline"
              size="xs"
              onClick={handleCenter}
              className="w-full border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <Move className="h-3 w-3" />
              Center on Canvas
            </Button>
          </div>

          <Separator className="bg-zinc-800/60" />

          {/* ---- Actions Panel ---- */}
          <div>
            <SectionHeader icon={CircuitBoard} title="Actions" />
            <div className="space-y-1.5">
              {/* Row 1: Duplicate + Rotate */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleDuplicate}
                  className="border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                >
                  <Copy className="h-3 w-3" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    updateComponent(component.id, {
                      rotation: (component.rotation + 90) % 360,
                    })
                  }
                  className="border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                >
                  <RotateCw className="h-3 w-3" />
                  Rotate CW
                </Button>
              </div>
              {/* Row 2: CCW + Z-order */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    updateComponent(component.id, {
                      rotation: (component.rotation - 90 + 360) % 360,
                    })
                  }
                  className="border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                >
                  <RotateCcw className="h-3 w-3" />
                  Rotate CCW
                </Button>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={handleBringToFront}
                    title="Move to Front"
                    className="border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    <ArrowUpToLine className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={handleSendToBack}
                    title="Move to Back"
                    className="border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    <ArrowDownToLine className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {/* Delete */}
              <Button
                variant="outline"
                size="xs"
                onClick={handleDelete}
                className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 mt-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete Component
              </Button>
            </div>
          </div>

          {/* ---- Simulation Info Panel (visible during simulation) ---- */}
          {isRunning && (
            <>
              <Separator className="bg-zinc-800/60" />
              <div>
                <SectionHeader
                  icon={Activity}
                  title="Simulation"
                  badge={
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      Running
                    </span>
                  }
                />

                {/* Active pins highlight */}
                <div className="rounded-md bg-zinc-900/80 border border-zinc-800/60 p-2.5 mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Active Pins
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {
                        (simulation.pinStates[component.id] ?? component.pins).filter(
                          (p) => p.value === 'high',
                        ).length
                      }{' '}
                      / {component.pins.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {(simulation.pinStates[component.id] ?? component.pins)
                      .filter((p) => p.value === 'high')
                      .map((pin) => (
                        <div
                          key={pin.pinNumber}
                          className="flex items-center justify-between px-2 py-1 rounded bg-emerald-500/8 ring-1 ring-emerald-500/15"
                        >
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {pin.pinName}
                          </span>
                          <div className="flex items-center gap-2">
                            {pin.voltage !== undefined && (
                              <span className="text-[10px] text-emerald-300/70 font-mono tabular-nums">
                                {pin.voltage.toFixed(2)}V
                              </span>
                            )}
                            <PinStateDot value="high" />
                          </div>
                        </div>
                      ))}
                    {(simulation.pinStates[component.id] ?? component.pins).filter(
                      (p) => p.value === 'high',
                    ).length === 0 && (
                      <p className="text-[10px] text-zinc-600 text-center py-1 italic">
                        No active pins
                      </p>
                    )}
                  </div>
                </div>

                {/* Power consumption estimate */}
                {powerEstimate && (
                  <div className="rounded-md bg-zinc-900/80 border border-zinc-800/60 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Gauge className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                        Power Estimate
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-zinc-600 uppercase">Current</p>
                        <p className="text-xs text-zinc-300 font-mono tabular-nums">
                          {powerEstimate.current} mA
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-600 uppercase">Power</p>
                        <p className="text-xs text-zinc-300 font-mono tabular-nums">
                          {powerEstimate.power} mW
                        </p>
                      </div>
                    </div>
                    <p className="text-[9px] text-zinc-700 mt-1.5 italic">
                      Estimate: {powerEstimate.highPins} pin(s) × 5V × 2mA
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
