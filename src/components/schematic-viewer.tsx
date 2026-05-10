'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { getBoardById } from '@/lib/board-registry';
import type { CircuitComponent, ViewMode, PinState } from '@/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GRID_SIZE = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const CONNECTION_THRESHOLD = 60;
const HANDLE_SIZE = 6;

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */

interface DragState {
  componentId: string;
  startMouseX: number;
  startMouseY: number;
  startCompX: number;
  startCompY: number;
}

interface PanState {
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  componentId: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

function screenToCanvas(
  clientX: number,
  clientY: number,
  containerRef: React.RefObject<HTMLDivElement | null>,
  panX: number,
  panY: number,
  zoom: number
) {
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: (clientX - rect.left - panX) / zoom,
    y: (clientY - rect.top - panY) / zoom,
  };
}

function getBandColor(resistance: number, bandIndex: number): string {
  const colors = [
    '#000000', '#964B00', '#FF0000', '#FF8C00', '#FFFF00',
    '#00FF00', '#0000FF', '#800080', '#808080', '#FFFFFF',
  ];
  const digits = resistance.toString().split('').map(Number);
  if (bandIndex === 0 && digits.length > 0) return colors[digits[0]];
  if (bandIndex === 1 && digits.length > 1) return colors[digits[1]];
  return '#FF0000';
}

function isPinHigh(pins: PinState[] | undefined): boolean {
  return pins?.[0]?.value === 'high';
}

/* ------------------------------------------------------------------ */
/*  Module-level SVG helper components                                  */
/* ------------------------------------------------------------------ */

function PinDot({ x, y, high, isRunning }: { x: number; y: number; high?: boolean; isRunning: boolean }) {
  return (
    <g>
      {high && isRunning && (
        <circle cx={x} cy={y} r={5} fill="#10b981" opacity={0.2} />
      )}
      <circle
        cx={x} cy={y} r={2.5}
        fill={high && isRunning ? '#10b981' : '#3f3f46'}
        stroke={high && isRunning ? '#064e3b' : '#52525b'}
        strokeWidth={0.8}
      />
    </g>
  );
}

function NetLabel({ x, y, label, high, isRunning }: { x: number; y: number; label: string; high?: boolean; isRunning: boolean }) {
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      fill={high && isRunning ? '#10b981' : '#71717a'}
      fontSize={6} fontFamily="monospace"
    >
      {label}
    </text>
  );
}

function Pad({ x, y, padColor }: { x: number; y: number; padColor: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.5} fill={padColor} stroke="#0a3d0a" strokeWidth={0.5} />
      <circle cx={x} cy={y} r={1.5} fill="#0a3d0a" />
    </g>
  );
}

function SilkLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fill="#c8c8a0" fontSize={5} fontFamily="monospace">{text}</text>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SchematicViewer({ className = '' }: { className?: string }) {
  const {
    components,
    selectedComponentId,
    setSelectedComponent,
    zoom,
    setZoom,
    showGrid,
    toggleGrid,
    viewMode,
    setViewMode,
    simulation,
    boardType,
    addComponent,
    removeComponent,
    updateComponent,
  } = useSimulatorStore();

  /* --- local state --- */
  const containerRef = useRef<HTMLDivElement>(null);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  /* --- derived --- */
  const isRunning = simulation.isRunning;
  const selectedComp = components.find((c) => c.id === selectedComponentId);

  /* --- zoom to fit --- */
  const zoomToFit = useCallback(() => {
    if (components.length === 0) {
      setPanX(0);
      setPanY(0);
      setZoom(1);
      return;
    }
    const xs = components.map((c) => c.x);
    const ys = components.map((c) => c.y);
    const minX = Math.min(...xs) - 60;
    const maxX = Math.max(...xs) + 60;
    const minY = Math.min(...ys) - 60;
    const maxY = Math.max(...ys) + 60;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = rect.width;
    const h = rect.height;
    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min(w / (maxX - minX), h / (maxY - minY)))
    );
    setZoom(newZoom);
    setPanX(w / 2 - ((minX + maxX) / 2) * newZoom);
    setPanY(h / 2 - ((minY + maxY) / 2) * newZoom);
  }, [components, setZoom]);

  /* --- keyboard --- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setSpaceDown(true);
      }
      if (e.key === 'Escape') {
        setSelectedComponent(null);
        setContextMenu(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId && !contextMenu) {
          removeComponent(selectedComponentId);
          setSelectedComponent(null);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedComponentId, removeComponent, setSelectedComponent, contextMenu]);

  /* close context menu on any click */
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  /* --- mouse wheel zoom --- */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
      const scale = newZoom / zoom;
      setPanX(mx - (mx - panX) * scale);
      setPanY(my - (my - panY) * scale);
      setZoom(newZoom);
    },
    [zoom, panX, panY, setZoom]
  );

  /* --- pan (middle-click or space+drag) --- */
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (spaceDown && e.button === 0)) {
        e.preventDefault();
        setPanState({
          startX: e.clientX,
          startY: e.clientY,
          startPanX: panX,
          startPanY: panY,
        });
        return;
      }
      /* deselect on empty canvas click */
      if (e.button === 0 && e.target === containerRef.current?.querySelector('svg rect:first-child')) {
        setSelectedComponent(null);
      }
    },
    [spaceDown, panX, panY, setSelectedComponent]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      /* pan */
      if (panState) {
        setPanX(panState.startPanX + (e.clientX - panState.startX));
        setPanY(panState.startPanY + (e.clientY - panState.startY));
        return;
      }
      /* drag component */
      if (dragState) {
        const pos = screenToCanvas(e.clientX, e.clientY, containerRef, panX, panY, zoom);
        let nx = dragState.startCompX + (pos.x - (dragState.startMouseX - (panX / zoom + dragState.startCompX - dragState.startCompX)));
        // Simpler: delta in screen space → delta in canvas space
        const dx = (e.clientX - dragState.startMouseX) / zoom;
        const dy = (e.clientY - dragState.startMouseY) / zoom;
        nx = dragState.startCompX + dx;
        const ny = dragState.startCompY + dy;
        updateComponent(dragState.componentId, {
          x: snapEnabled ? snapToGrid(nx) : nx,
          y: snapEnabled ? snapToGrid(ny) : ny,
        });
      }
    },
    [dragState, panState, zoom, panX, panY, updateComponent, snapEnabled]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setDragState(null);
    setPanState(null);
  }, []);

  /* --- component drag start --- */
  const handleComponentMouseDown = useCallback(
    (e: React.MouseEvent, comp: CircuitComponent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      setSelectedComponent(comp.id);
      setDragState({
        componentId: comp.id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startCompX: comp.x,
        startCompY: comp.y,
      });
    },
    [setSelectedComponent]
  );

  /* --- right-click context menu --- */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, comp: CircuitComponent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedComponent(comp.id);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        componentId: comp.id,
      });
    },
    [setSelectedComponent]
  );

  /* --- clear and reorder (defined before context menu actions) --- */
  const clearAndReorder = useCallback(
    (newOrder: CircuitComponent[]) => {
      const { clearComponents, addComponent: add } = useSimulatorStore.getState();
      clearComponents();
      newOrder.forEach(add);
    },
    []
  );

  /* --- context menu actions --- */
  const contextDuplicate = useCallback(() => {
    if (!contextMenu) return;
    const comp = components.find((c) => c.id === contextMenu.componentId);
    if (!comp) return;
    addComponent({
      ...comp,
      id: `${comp.type}-${Date.now()}`,
      name: `${comp.name} (copy)`,
      x: comp.x + GRID_SIZE * 2,
      y: comp.y + GRID_SIZE * 2,
    });
    setContextMenu(null);
  }, [contextMenu, components, addComponent]);

  const contextRotate = useCallback(() => {
    if (!contextMenu) return;
    const comp = components.find((c) => c.id === contextMenu.componentId);
    if (!comp) return;
    updateComponent(comp.id, { rotation: (comp.rotation + 90) % 360 });
    setContextMenu(null);
  }, [contextMenu, components, updateComponent]);

  const contextDelete = useCallback(() => {
    if (!contextMenu) return;
    removeComponent(contextMenu.componentId);
    setSelectedComponent(null);
    setContextMenu(null);
  }, [contextMenu, removeComponent, setSelectedComponent]);

  const contextBringToFront = useCallback(() => {
    if (!contextMenu) return;
    const comp = components.find((c) => c.id === contextMenu.componentId);
    if (!comp) return;
    const idx = components.indexOf(comp);
    const reordered = [...components];
    reordered.splice(idx, 1);
    reordered.push(comp);
    clearAndReorder(reordered);
    setContextMenu(null);
  }, [contextMenu, components, clearAndReorder]);

  const contextSendToBack = useCallback(() => {
    if (!contextMenu) return;
    const comp = components.find((c) => c.id === contextMenu.componentId);
    if (!comp) return;
    const reordered = [comp, ...components.filter((c) => c.id !== comp.id)];
    clearAndReorder(reordered);
    setContextMenu(null);
  }, [contextMenu, components, clearAndReorder]);

  /* ================================================================ */
  /*  Render helpers                                                   */
  /* ================================================================ */

  const cursorStyle = spaceDown || panState
    ? 'grab'
    : dragState
      ? 'grabbing'
      : 'crosshair';

  /* ------------------------------------------------------------------ */
  /*  Connection wires between nearby components                        */
  /* ------------------------------------------------------------------ */
  const renderConnections = () => {
    const conns: React.ReactNode[] = [];
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const a = components[i];
        const b = components[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_THRESHOLD && dist > 0) {
          const aActive = isPinHigh(simulation.pinStates[a.id]);
          const bActive = isPinHigh(simulation.pinStates[b.id]);
          const wireActive = isRunning && (aActive || bActive);
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          // Manhattan-style route
          conns.push(
            <g key={`conn-${a.id}-${b.id}`}>
              {wireActive && (
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#10b981" strokeWidth={4} opacity={0.25}
                />
              )}
              <polyline
                points={`${a.x},${a.y} ${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}`}
                fill="none"
                stroke={wireActive ? '#10b981' : '#52525b'}
                strokeWidth={wireActive ? 1.8 : 1}
                strokeDasharray={wireActive ? 'none' : '4,3'}
                opacity={wireActive ? 1 : 0.6}
              />
              <circle cx={midX} cy={midY} r={2}
                fill={wireActive ? '#10b981' : '#52525b'}
              />
            </g>
          );
        }
      }
    }
    return conns;
  };

  /* ------------------------------------------------------------------ */
  /*  Component rendering dispatcher                                    */
  /* ------------------------------------------------------------------ */
  const renderComponent = (comp: CircuitComponent, index: number) => {
    const isSelected = comp.id === selectedComponentId;
    const isDragging = dragState?.componentId === comp.id;
    const simPins = simulation.pinStates[comp.id];
    const baseOpacity = isDragging ? 0.4 : 1;

    const body = viewMode === 'schematic'
      ? renderSchematicSymbol(comp, simPins)
      : viewMode === 'pcb'
        ? renderPCBComponent(comp, simPins)
        : renderBreadboardComponent(comp, simPins);

    return (
      <g
        key={comp.id}
        transform={`translate(${comp.x}, ${comp.y}) rotate(${comp.rotation})`}
        className="cursor-pointer"
        opacity={baseOpacity}
        onMouseDown={(e) => handleComponentMouseDown(e, comp)}
        onContextMenu={(e) => handleContextMenu(e, comp)}
      >
        {/* Ghost while dragging */}
        {isDragging && (
          <g opacity={0.3} transform={`translate(${8}, ${8})`}>
            {renderBreadboardComponent(comp, simPins)}
          </g>
        )}

        {body}

        {/* Selection handles */}
        {isSelected && renderSelectionHandles(comp)}

        {/* Pin labels on selected */}
        {isSelected && comp.pins && renderPinLabels(comp, simPins)}
      </g>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Selection handles                                                 */
  /* ------------------------------------------------------------------ */
  const renderSelectionHandles = (comp: CircuitComponent) => {
    const w = 40;
    const h = 28;
    return (
      <g pointerEvents="none">
        {/* Selection border */}
        <rect
          x={-w / 2 - 4} y={-h / 2 - 4}
          width={w + 8} height={h + 8}
          fill="none" stroke="#10b981" strokeWidth={1.5}
          strokeDasharray="6,3" rx={3}
        />
        {/* Corner handles */}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
          <rect
            key={i}
            x={sx * (w / 2 + 4) - HANDLE_SIZE / 2}
            y={sy * (h / 2 + 4) - HANDLE_SIZE / 2}
            width={HANDLE_SIZE} height={HANDLE_SIZE}
            fill="#10b981" stroke="#064e3b" strokeWidth={1} rx={1}
          />
        ))}
        {/* Rotation handle */}
        <line
          x1={0} y1={-h / 2 - 4} x2={0} y2={-h / 2 - 16}
          stroke="#10b981" strokeWidth={1.2}
        />
        <circle
          cx={0} cy={-h / 2 - 18} r={4}
          fill="#10b981" stroke="#064e3b" strokeWidth={1}
        />
        {/* Rotation icon */}
        <path
          d="M-2,-19 a3,3 0 1,1 4,0"
          fill="none" stroke="#fff" strokeWidth={1}
        />
      </g>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Pin labels on selected component                                  */
  /* ------------------------------------------------------------------ */
  const renderPinLabels = (comp: CircuitComponent, simPins?: PinState[]) => {
    if (!comp.pins || comp.pins.length === 0) return null;
    const w = 40;
    return (
      <g pointerEvents="none">
        {comp.pins.map((pin, i) => {
          const side = i < Math.ceil(comp.pins.length / 2) ? -1 : 1;
          const idx = side === -1 ? i : i - Math.ceil(comp.pins.length / 2);
          const totalOnSide = Math.ceil(comp.pins.length / 2);
          const py = -((totalOnSide - 1) * 6) / 2 + idx * 6;
          const px = side * (w / 2 + 8);
          const pinState = simPins?.find((p) => p.pinNumber === pin.pinNumber);
          const active = pinState?.value === 'high';

          return (
            <g key={`pin-label-${i}`}>
              <circle
                cx={side * (w / 2 + 2)} cy={py} r={2}
                fill={active && isRunning ? '#10b981' : '#52525b'}
              />
              <text
                x={px} y={py + 3}
                textAnchor={side === -1 ? 'end' : 'start'}
                fill={active && isRunning ? '#10b981' : '#9ca3af'}
                fontSize={7} fontFamily="monospace"
              >
                {pin.pinName}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  BREADBOARD view – original-ish component bodies                   */
  /* ------------------------------------------------------------------ */
  const renderBreadboardComponent = (comp: CircuitComponent, simPins?: PinState[]) => {
    return <BreadboardBody comp={comp} simPins={simPins} />;
  };

  /* ------------------------------------------------------------------ */
  /*  SCHEMATIC view – clean ANSI-style symbols                         */
  /* ------------------------------------------------------------------ */
  const renderSchematicSymbol = (comp: CircuitComponent, simPins?: PinState[]) => {
    return <SchematicSymbol comp={comp} simPins={simPins} isRunning={isRunning} />;
  };

  /* ------------------------------------------------------------------ */
  /*  PCB view – green PCB aesthetic                                    */
  /* ------------------------------------------------------------------ */
  const renderPCBComponent = (comp: CircuitComponent, simPins?: PinState[]) => {
    return <PCBComponent comp={comp} simPins={simPins} isRunning={isRunning} />;
  };

  /* ------------------------------------------------------------------ */
  /*  Grid rendering                                                    */
  /* ------------------------------------------------------------------ */
  const renderGrid = () => {
    if (!showGrid) return null;
    const lines: React.ReactNode[] = [];
    const extent = 2000;
    for (let x = -extent; x <= extent; x += GRID_SIZE) {
      lines.push(
        <line key={`vg-${x}`} x1={x} y1={-extent} x2={x} y2={extent}
          stroke="#27272a" strokeWidth={0.5}
        />
      );
    }
    for (let y = -extent; y <= extent; y += GRID_SIZE) {
      lines.push(
        <line key={`hg-${y}`} x1={-extent} y1={y} x2={extent} y2={y}
          stroke="#27272a" strokeWidth={0.5}
        />
      );
    }
    return <g>{lines}</g>;
  };

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${className}`}>
      {/* ============ TOOLBAR ============ */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800/95 border-b border-zinc-700 backdrop-blur">
        {/* View mode tabs */}
        <div className="flex items-center gap-1">
          {(['breadboard', 'schematic', 'pcb'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {mode === 'breadboard' ? 'BB' : mode === 'schematic' ? 'SCH' : 'PCB'}
            </button>
          ))}

          <div className="w-px h-5 bg-zinc-600 mx-1" />

          {/* Zoom controls */}
          <button onClick={() => setZoom(zoom / 1.2)} className="px-1.5 py-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded text-xs font-bold">
            −
          </button>
          <span className="text-[10px] text-zinc-400 font-mono w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => setZoom(zoom * 1.2)} className="px-1.5 py-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded text-xs font-bold">
            +
          </button>
          <button
            onClick={zoomToFit}
            className="px-1.5 py-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded text-[10px]"
            title="Zoom to Fit"
          >
            Fit
          </button>

          <div className="w-px h-5 bg-zinc-600 mx-1" />

          {/* Grid toggle */}
          <button
            onClick={toggleGrid}
            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
              showGrid ? 'bg-emerald-600/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Grid
          </button>

          {/* Snap toggle */}
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
              snapEnabled ? 'bg-amber-600/20 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Snap
          </button>
        </div>

        {/* Right side info */}
        <div className="flex items-center gap-3 text-zinc-500">
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
          <span className="text-[10px]">{components.length} comp{components.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ============ CANVAS ============ */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: cursorStyle }}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          className="select-none"
        >
          <defs>
            {/* Glow filter for active wires */}
            <filter id="emerald-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* PCB copper gradient */}
            <linearGradient id="copper-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c87533" />
              <stop offset="100%" stopColor="#b8860b" />
            </linearGradient>
          </defs>

          <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
            {/* Background */}
            <rect
              x={-2000} y={-2000} width={4000} height={4000}
              fill={viewMode === 'pcb' ? '#0a3d0a' : '#18181b'}
            />

            {/* PCB background texture */}
            {viewMode === 'pcb' && (
              <g opacity={0.15}>
                {Array.from({ length: 60 }, (_, i) => (
                  <line key={`pcb-h-${i}`}
                    x1={-1000} y1={i * 40} x2={1000} y2={i * 40}
                    stroke="#0d4d0d" strokeWidth={0.5}
                  />
                ))}
                {Array.from({ length: 80 }, (_, i) => (
                  <line key={`pcb-v-${i}`}
                    x1={i * 40} y1={-1000} x2={i * 40} y2={1000}
                    stroke="#0d4d0d" strokeWidth={0.5}
                  />
                ))}
              </g>
            )}

            {/* Grid */}
            {viewMode !== 'pcb' && renderGrid()}

            {/* PCB grid */}
            {viewMode === 'pcb' && showGrid && (
              <g opacity={0.2}>
                {Array.from({ length: 100 }, (_, i) => (
                  <line key={`pcb-gx-${i}`}
                    x1={i * GRID_SIZE} y1={-1000} x2={i * GRID_SIZE} y2={1000}
                    stroke="#1a5c1a" strokeWidth={0.3}
                  />
                ))}
                {Array.from({ length: 100 }, (_, i) => (
                  <line key={`pcb-gy-${i}`}
                    x1={-1000} y1={i * GRID_SIZE} x2={1000} y2={i * GRID_SIZE}
                    stroke="#1a5c1a" strokeWidth={0.3}
                  />
                ))}
              </g>
            )}

            {/* Breadboard view */}
            {viewMode === 'breadboard' && <BreadboardSVG />}

            {/* Active board */}
            <ActiveBoardSVG boardId={boardType} viewMode={viewMode} />

            {/* Connections */}
            {renderConnections()}

            {/* Components */}
            {components.map((c, i) => renderComponent(c, i))}
          </g>
        </svg>

        {/* Watermark */}
        <div className="absolute bottom-3 right-3 text-[10px] text-zinc-700 font-medium pointer-events-none">
          Eesha Learn Simulator
        </div>
      </div>

      {/* ============ CONTEXT MENU ============ */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl shadow-black/40 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ContextMenuItem label="Duplicate Component" shortcut="Ctrl+D" onClick={contextDuplicate} icon="⧉" />
          <ContextMenuItem label="Rotate 90°" shortcut="R" onClick={contextRotate} icon="↻" />
          <div className="h-px bg-zinc-700 my-1" />
          <ContextMenuItem label="Bring to Front" onClick={contextBringToFront} icon="↑" />
          <ContextMenuItem label="Send to Back" onClick={contextSendToBack} icon="↓" />
          <div className="h-px bg-zinc-700 my-1" />
          <ContextMenuItem label="Delete Component" shortcut="Del" onClick={contextDelete} icon="✕" danger />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Context menu item                                                  */
/* ------------------------------------------------------------------ */

function ContextMenuItem({
  label,
  shortcut,
  onClick,
  icon,
  danger,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  icon?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      <span className="flex items-center gap-2">
        {icon && <span className="text-sm w-4 text-center">{icon}</span>}
        {label}
      </span>
      {shortcut && (
        <span className="text-[10px] text-zinc-500 ml-4">{shortcut}</span>
      )}
    </button>
  );
}

/* ================================================================== */
/*  BREADBOARD VIEW BODY                                               */
/* ================================================================== */

function BreadboardBody({ comp, simPins }: { comp: CircuitComponent; simPins?: PinState[] }) {
  switch (comp.type) {
    case 'led': {
      const on = isPinHigh(simPins);
      const color = comp.props?.color || '#ef4444';
      return (
        <g>
          <circle cx={0} cy={0} r={12} fill={on ? color : '#374151'} stroke={color} strokeWidth={1.5} opacity={on ? 1 : 0.5} />
          {on && <>
            <circle cx={0} cy={0} r={18} fill={color} opacity={0.15} />
            <circle cx={0} cy={0} r={25} fill={color} opacity={0.08} />
          </>}
          <line x1={-25} y1={0} x2={-12} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={12} y1={0} x2={25} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={8} y1={-12} x2={8} y2={12} stroke={color} strokeWidth={2} />
          <text x={0} y={4} textAnchor="middle" fill={on ? 'white' : '#6b7280'} fontSize={7} fontWeight="bold">LED</text>
        </g>
      );
    }
    case 'rgb_led': {
      const rOn = simPins?.find(p => p.pinName === 'red')?.value === 'high';
      const gOn = simPins?.find(p => p.pinName === 'green')?.value === 'high';
      const bOn = simPins?.find(p => p.pinName === 'blue')?.value === 'high';
      const mixColor = `rgb(${rOn ? 255 : 30}, ${gOn ? 255 : 30}, ${bOn ? 255 : 30})`;
      const isOn = rOn || gOn || bOn;
      return (
        <g>
          <circle cx={0} cy={0} r={14} fill={isOn ? mixColor : '#374151'} stroke="#9ca3af" strokeWidth={1.5} />
          {isOn && <>
            <circle cx={0} cy={0} r={20} fill={mixColor} opacity={0.2} />
            <circle cx={0} cy={0} r={28} fill={mixColor} opacity={0.1} />
          </>}
          <line x1={-30} y1={-5} x2={-14} y2={-5} stroke="#ef4444" strokeWidth={1.5} />
          <line x1={-30} y1={5} x2={-14} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={14} y1={-5} x2={30} y2={-5} stroke="#22c55e" strokeWidth={1.5} />
          <line x1={14} y1={5} x2={30} y2={5} stroke="#3b82f6" strokeWidth={1.5} />
          <text x={0} y={4} textAnchor="middle" fill={isOn ? 'white' : '#6b7280'} fontSize={6} fontWeight="bold">RGB</text>
        </g>
      );
    }
    case 'resistor': {
      const r = comp.props?.resistance || 220;
      return (
        <g>
          <line x1={-30} y1={0} x2={-20} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={20} y1={0} x2={30} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <rect x={-20} y={-6} width={40} height={12} rx={3} fill="#f5f5dc" stroke="#b0a890" strokeWidth={1} />
          <rect x={-14} y={-6} width={3} height={12} fill={getBandColor(r, 0)} />
          <rect x={-8} y={-6} width={3} height={12} fill={getBandColor(r, 1)} />
          <rect x={-2} y={-6} width={3} height={12} fill={getBandColor(r, 2)} />
          <rect x={6} y={-6} width={3} height={12} fill="#d4a843" />
          <rect x={12} y={-6} width={3} height={12} fill="#d4a843" />
          <text x={0} y={22} textAnchor="middle" fill="#6b7280" fontSize={8}>
            {r >= 1000 ? `${r / 1000}kΩ` : `${r}Ω`}
          </text>
        </g>
      );
    }
    case 'button': {
      const pressed = isPinHigh(simPins);
      return (
        <g>
          <rect x={-15} y={-10} width={30} height={20} rx={3} fill="#374151" stroke={pressed ? '#10b981' : '#6b7280'} strokeWidth={1.5} />
          <rect x={-10} y={-7} width={20} height={14} rx={2} fill={pressed ? '#065f46' : '#4b5563'} stroke="#9ca3af" strokeWidth={0.5} />
          <line x1={-20} y1={-5} x2={-15} y2={-5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={15} y1={-5} x2={20} y2={-5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={-20} y1={5} x2={-15} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={15} y1={5} x2={20} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <text x={0} y={3} textAnchor="middle" fill="#9ca3af" fontSize={7}>{pressed ? 'ON' : 'BTN'}</text>
        </g>
      );
    }
    case 'potentiometer':
      return (
        <g>
          <circle cx={0} cy={0} r={12} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
          <line x1={0} y1={0} x2={8} y2={-8} stroke="#d4a843" strokeWidth={2} strokeLinecap="round" />
          <circle cx={0} cy={0} r={3} fill="#6b7280" />
          <line x1={-25} y1={8} x2={-12} y2={8} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={0} y1={12} x2={0} y2={25} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={-25} y1={-8} x2={-12} y2={-8} stroke="#9ca3af" strokeWidth={1.5} />
          <text x={0} y={35} textAnchor="middle" fill="#6b7280" fontSize={7}>
            {comp.props?.resistance != null && comp.props.resistance >= 1000 ? `${comp.props.resistance / 1000}kΩ` : `${comp.props?.resistance || 10}kΩ`}
          </text>
        </g>
      );
    case 'buzzer': {
      const buzzing = isPinHigh(simPins);
      return (
        <g>
          <circle cx={0} cy={0} r={14} fill="#1f2937" stroke={buzzing ? '#f59e0b' : '#6b7280'} strokeWidth={1.5} />
          <circle cx={0} cy={0} r={8} fill="#111827" />
          <text x={0} y={4} textAnchor="middle" fill={buzzing ? '#f59e0b' : '#6b7280'} fontSize={8} fontWeight="bold">BZ</text>
          {buzzing && <>
            <text x={-22} y={-18} fill="#f59e0b" fontSize={10}>♪</text>
            <text x={15} y={-22} fill="#f59e0b" fontSize={8}>♫</text>
            <text x={18} y={-10} fill="#f59e0b" fontSize={12}>♪</text>
          </>}
          <line x1={-25} y1={5} x2={-14} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={14} y1={5} x2={25} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
        </g>
      );
    }
    case 'lcd':
      return (
        <g>
          <rect x={-50} y={-20} width={100} height={40} rx={3} fill="#0a4d2e" stroke="#065f46" strokeWidth={1.5} />
          <rect x={-44} y={-14} width={88} height={28} rx={2} fill="#006633" />
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={-40 + i * 5} y={-8} width={4} height={8} fill="#33ff99" opacity={0.8} rx={0.5} />
          ))}
          <text x={0} y={15} textAnchor="middle" fill="#33ff99" fontSize={6} fontFamily="monospace">Eesha Learn</text>
          {[-40, -35, -30, 30, 35, 40].map((px, i) => (
            <line key={`lcd-pin-${i}`} x1={px} y1={20} x2={px} y2={28} stroke="#9ca3af" strokeWidth={1} />
          ))}
        </g>
      );
    case 'servo':
      return (
        <g>
          <rect x={-18} y={-12} width={36} height={24} rx={2} fill="#1e40af" stroke="#3b82f6" strokeWidth={1} />
          <circle cx={0} cy={0} r={6} fill="#1e3a8a" stroke="#60a5fa" strokeWidth={1} />
          <line x1={0} y1={0} x2={5} y2={0} stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
          <line x1={-25} y1={8} x2={-18} y2={8} stroke="#cc0000" strokeWidth={1.5} />
          <line x1={-25} y1={0} x2={-18} y2={0} stroke="#f97316" strokeWidth={1.5} />
          <line x1={-25} y1={-8} x2={-18} y2={-8} stroke="#6b7280" strokeWidth={1.5} />
          <text x={0} y={-18} textAnchor="middle" fill="#60a5fa" fontSize={7}>Servo</text>
        </g>
      );
    case 'photoresistor':
      return (
        <g>
          <circle cx={0} cy={0} r={10} fill="#8b6914" stroke="#a07d28" strokeWidth={1.5} opacity={0.8} />
          <path d="M -5 -3 Q 0 -7 5 -3 Q 0 7 -5 3 Z" fill="#cd9b1d" opacity={0.6} />
          <line x1={-25} y1={0} x2={-10} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={10} y1={0} x2={25} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <text x={0} y={20} textAnchor="middle" fill="#6b7280" fontSize={7}>LDR</text>
        </g>
      );
    case 'seven_segment':
      return (
        <g>
          <rect x={-20} y={-25} width={40} height={50} rx={2} fill="#111827" stroke="#374151" strokeWidth={1.5} />
          <text x={0} y={8} textAnchor="middle" fill="#ef4444" fontSize={28} fontWeight="bold" fontFamily="monospace">8</text>
          <line x1={-20} y1={5} x2={-25} y2={5} stroke="#9ca3af" strokeWidth={1} />
          <line x1={-20} y1={-5} x2={-25} y2={-5} stroke="#9ca3af" strokeWidth={1} />
          <line x1={-20} y1={15} x2={-25} y2={15} stroke="#9ca3af" strokeWidth={1} />
        </g>
      );
    case 'motor':
      return (
        <g>
          <rect x={-14} y={-14} width={28} height={28} rx={3} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
          <circle cx={0} cy={0} r={8} fill="#1f2937" stroke="#9ca3af" strokeWidth={1} />
          <circle cx={0} cy={0} r={3} fill="#6b7280" />
          <line x1={-25} y1={5} x2={-14} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={14} y1={5} x2={25} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <text x={0} y={3} textAnchor="middle" fill="#9ca3af" fontSize={7}>M</text>
        </g>
      );
    case 'battery':
      return (
        <g>
          <rect x={-12} y={-15} width={24} height={30} rx={3} fill="#1e3a8a" stroke="#3b82f6" strokeWidth={1.5} />
          <rect x={-3} y={-18} width={6} height={3} fill="#3b82f6" />
          <text x={0} y={0} textAnchor="middle" fill="#60a5fa" fontSize={7} fontWeight="bold">9V</text>
          <line x1={-25} y1={5} x2={-12} y2={5} stroke="#cc0000" strokeWidth={1.5} />
          <line x1={12} y1={-5} x2={25} y2={-5} stroke="#6b7280" strokeWidth={1.5} />
        </g>
      );
    case 'capacitor':
      return (
        <g>
          <line x1={-20} y1={0} x2={-4} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={4} y1={0} x2={20} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={-4} y1={-10} x2={-4} y2={10} stroke="#d4a843" strokeWidth={2} />
          <line x1={4} y1={-10} x2={4} y2={10} stroke="#d4a843" strokeWidth={2} />
          <text x={0} y={18} textAnchor="middle" fill="#6b7280" fontSize={7}>{comp.props?.capacitance || '100nF'}</text>
        </g>
      );
    default:
      return (
        <g>
          <rect x={-20} y={-12} width={40} height={24} rx={3} fill="#374151" stroke="#6b7280" strokeWidth={1} />
          <text x={0} y={4} textAnchor="middle" fill="#9ca3af" fontSize={8}>{comp.type}</text>
          <line x1={-25} y1={0} x2={-20} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={20} y1={0} x2={25} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
        </g>
      );
  }
}

/* ================================================================== */
/*  SCHEMATIC VIEW SYMBOLS                                             */
/* ================================================================== */

function SchematicSymbol({ comp, simPins, isRunning }: { comp: CircuitComponent; simPins?: PinState[]; isRunning: boolean }) {
  const anyHigh = simPins?.some(p => p.value === 'high');
  const active = isRunning && anyHigh;

  switch (comp.type) {
    case 'resistor': {
      const r = comp.props?.resistance || 220;
      const label = r >= 1000 ? `${r / 1000}kΩ` : `${r}Ω`;
      // Zigzag symbol
      const zigzag = 'M-25,0 L-20,0 L-18,-6 L-14,6 L-10,-6 L-6,6 L-2,-6 L2,6 L6,-6 L10,6 L14,-6 L16,0 L25,0';
      return (
        <g>
          <path d={zigzag} fill="none" stroke={active ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <text x={0} y={-12} textAnchor="middle" fill={active ? '#10b981' : '#71717a'} fontSize={7} fontFamily="monospace">{label}</text>
          <text x={0} y={14} textAnchor="middle" fill="#52525b" fontSize={6}>{comp.name}</text>
          <PinDot x={-25} y={0} high={simPins?.[0]?.value === 'high'} isRunning={isRunning} />
          <PinDot x={25} y={0} high={simPins?.[1]?.value === 'high'} isRunning={isRunning} />
          <NetLabel x={-25} y={-6} label={simPins?.[0]?.pinName || '1'} high={simPins?.[0]?.value === 'high'} isRunning={isRunning} />
          <NetLabel x={25} y={-6} label={simPins?.[1]?.pinName || '2'} high={simPins?.[1]?.value === 'high'} isRunning={isRunning} />
        </g>
      );
    }
    case 'capacitor': {
      const label = comp.props?.capacitance || '100nF';
      return (
        <g>
          <line x1={-25} y1={0} x2={-3} y2={0} stroke={active ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <line x1={3} y1={0} x2={25} y2={0} stroke={active ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <line x1={-3} y1={-10} x2={-3} y2={10} stroke={active ? '#10b981' : '#d4a843'} strokeWidth={2} />
          <line x1={3} y1={-10} x2={3} y2={10} stroke={active ? '#10b981' : '#d4a843'} strokeWidth={2} />
          {/* Curved plate for electrolytic */}
          <path d="M3,-10 Q7,0 3,10" fill="none" stroke={active ? '#10b981' : '#d4a843'} strokeWidth={1.5} />
          <text x={0} y={-14} textAnchor="middle" fill={active ? '#10b981' : '#71717a'} fontSize={7} fontFamily="monospace">{label}</text>
          <text x={0} y={18} textAnchor="middle" fill="#52525b" fontSize={6}>{comp.name}</text>
          <PinDot x={-25} y={0} high={simPins?.[0]?.value === 'high'} isRunning={isRunning} />
          <PinDot x={25} y={0} high={simPins?.[1]?.value === 'high'} isRunning={isRunning} />
          <NetLabel x={-25} y={-5} label="+" isRunning={isRunning} />
          <NetLabel x={25} y={-5} label="−" isRunning={isRunning} />
        </g>
      );
    }
    case 'led': {
      const on = simPins?.[0]?.value === 'high';
      const color = comp.props?.color || '#ef4444';
      return (
        <g>
          {/* Triangle + line symbol */}
          <polygon points="-8,-8 -8,8 10,0" fill="none" stroke={on ? color : '#a1a1aa'} strokeWidth={1.2} />
          <line x1={10} y1={-8} x2={10} y2={8} stroke={on ? color : '#a1a1aa'} strokeWidth={1.5} />
          {/* Arrows for light emission */}
          <line x1={4} y1={-10} x2={8} y2={-16} stroke={on ? color : '#52525b'} strokeWidth={0.8} />
          <line x1={8} y1={-16} x2={5} y2={-14} stroke={on ? color : '#52525b'} strokeWidth={0.8} />
          <line x1={8} y1={-16} x2={8} y2={-13} stroke={on ? color : '#52525b'} strokeWidth={0.8} />
          <line x1={8} y1={-8} x2={12} y2={-14} stroke={on ? color : '#52525b'} strokeWidth={0.8} />
          <line x1={12} y1={-14} x2={9} y2={-12} stroke={on ? color : '#52525b'} strokeWidth={0.8} />
          {/* Leads */}
          <line x1={-25} y1={0} x2={-8} y2={0} stroke={on ? color : '#a1a1aa'} strokeWidth={1.2} />
          <line x1={10} y1={0} x2={25} y2={0} stroke={on ? color : '#a1a1aa'} strokeWidth={1.2} />
          {/* Glow when active */}
          {on && <circle cx={2} cy={0} r={16} fill={color} opacity={0.08} />}
          <text x={0} y={18} textAnchor="middle" fill={on ? color : '#71717a'} fontSize={7} fontFamily="monospace">{comp.name}</text>
          <PinDot x={-25} y={0} high={on} isRunning={isRunning} />
          <PinDot x={25} y={0} high={false} isRunning={isRunning} />
          <NetLabel x={-25} y={-5} label="A" high={on} isRunning={isRunning} />
          <NetLabel x={25} y={-5} label="K" isRunning={isRunning} />
        </g>
      );
    }
    case 'rgb_led': {
      const rOn = simPins?.find(p => p.pinName === 'red')?.value === 'high';
      const gOn = simPins?.find(p => p.pinName === 'green')?.value === 'high';
      const bOn = simPins?.find(p => p.pinName === 'blue')?.value === 'high';
      return (
        <g>
          {[
            { color: '#ef4444', y: -6, on: rOn, label: 'R' },
            { color: '#22c55e', y: 0, on: gOn, label: 'G' },
            { color: '#3b82f6', y: 6, on: bOn, label: 'B' },
          ].map((ch) => (
            <g key={ch.label}>
              <polygon
                points={`${-8},${ch.y - 3} -8,${ch.y + 3} 2,${ch.y}`}
                fill="none" stroke={ch.on ? ch.color : '#52525b'} strokeWidth={1}
              />
              <line x1={2} y1={ch.y - 3} x2={2} y2={ch.y + 3} stroke={ch.on ? ch.color : '#52525b'} strokeWidth={1.2} />
              <line x1={-20} y1={ch.y} x2={-8} y2={ch.y} stroke={ch.on ? ch.color : '#52525b'} strokeWidth={0.8} />
              <line x1={2} y1={ch.y} x2={14} y2={ch.y} stroke={ch.on ? ch.color : '#52525b'} strokeWidth={0.8} />
              {ch.on && <circle cx={-3} cy={ch.y} r={8} fill={ch.color} opacity={0.06} />}
            </g>
          ))}
          <line x1={14} y1={-6} x2={25} y2={-6} stroke="#9ca3af" strokeWidth={0.8} />
          <line x1={14} y1={0} x2={25} y2={0} stroke="#9ca3af" strokeWidth={0.8} />
          <text x={0} y={16} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{comp.name}</text>
          <PinDot x={-20} y={-6} high={rOn} isRunning={isRunning} />
          <PinDot x={-20} y={0} high={gOn} isRunning={isRunning} />
          <PinDot x={-20} y={6} high={bOn} isRunning={isRunning} />
        </g>
      );
    }
    case 'button': {
      const pressed = simPins?.[0]?.value === 'high';
      return (
        <g>
          {/* Normally-open switch symbol */}
          <line x1={-25} y1={0} x2={-8} y2={0} stroke={pressed ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <line x1={8} y1={0} x2={25} y2={0} stroke={pressed ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <circle cx={-8} cy={0} r={2} fill={pressed ? '#10b981' : '#52525b'} />
          <circle cx={8} cy={0} r={2} fill={pressed ? '#10b981' : '#52525b'} />
          {/* Switch arm */}
          <line
            x1={-8} y1={0} x2={pressed ? 8 : 6}
            y2={pressed ? 0 : -8}
            stroke={pressed ? '#10b981' : '#a1a1aa'} strokeWidth={1.5}
          />
          <text x={0} y={-14} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{comp.name}</text>
          <PinDot x={-25} y={0} high={pressed} isRunning={isRunning} />
          <PinDot x={25} y={0} high={pressed} isRunning={isRunning} />
        </g>
      );
    }
    case 'potentiometer': {
      const r = comp.props?.resistance || 10000;
      const label = r >= 1000 ? `${r / 1000}kΩ` : `${r}Ω`;
      return (
        <g>
          {/* Zigzag */}
          <path
            d="M-20,0 L-18,-5 L-14,5 L-10,-5 L-6,5 L-2,-5 L2,5 L6,-5 L8,0"
            fill="none" stroke={active ? '#10b981' : '#a1a1aa'} strokeWidth={1}
          />
          {/* Arrow for wiper */}
          <line x1={0} y1={6} x2={0} y2={14} stroke="#d4a843" strokeWidth={1.2} />
          <polygon points="-4,14 4,14 0,20" fill="#d4a843" />
          {/* Leads */}
          <line x1={-25} y1={0} x2={-20} y2={0} stroke={active ? '#10b981' : '#a1a1aa'} strokeWidth={1} />
          <line x1={8} y1={0} x2={25} y2={0} stroke={active ? '#10b981' : '#a1a1aa'} strokeWidth={1} />
          <line x1={0} y1={20} x2={0} y2={28} stroke={active ? '#10b981' : '#a1a1aa'} strokeWidth={1} />
          <text x={-12} y={-8} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{label}</text>
          <PinDot x={-25} y={0} isRunning={isRunning} />
          <PinDot x={25} y={0} isRunning={isRunning} />
          <PinDot x={0} y={28} isRunning={isRunning} />
        </g>
      );
    }
    case 'buzzer': {
      const on = isPinHigh(simPins);
      return (
        <g>
          <circle cx={-5} cy={0} r={10} fill="none" stroke={on ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <circle cx={-5} cy={0} r={4} fill="none" stroke={on ? '#10b981' : '#a1a1aa'} strokeWidth={1} />
          <line x1={-25} y1={0} x2={-15} y2={0} stroke={on ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          {/* + indicator */}
          <text x={-15} y={-3} fill={on ? '#10b981' : '#52525b'} fontSize={8}>+</text>
          <line x1={5} y1={-6} x2={15} y2={-6} stroke={on ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <line x1={5} y1={6} x2={15} y2={6} stroke={on ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          {on && <>
            <text x={12} y={-10} fill="#f59e0b" fontSize={8}>♪</text>
            <text x={16} y={-14} fill="#f59e0b" fontSize={6}>♫</text>
          </>}
          <text x={-5} y={18} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{comp.name}</text>
          <PinDot x={-25} y={0} high={on} isRunning={isRunning} />
          <PinDot x={15} y={-6} isRunning={isRunning} />
          <PinDot x={15} y={6} isRunning={isRunning} />
        </g>
      );
    }
    case 'battery': {
      return (
        <g>
          <line x1={-25} y1={0} x2={-5} y2={0} stroke="#a1a1aa" strokeWidth={1.2} />
          <line x1={5} y1={0} x2={25} y2={0} stroke="#a1a1aa" strokeWidth={1.2} />
          {/* Long line (+) */}
          <line x1={-5} y1={-10} x2={-5} y2={10} stroke="#a1a1aa" strokeWidth={2} />
          {/* Short line (-) */}
          <line x1={5} y1={-5} x2={5} y2={5} stroke="#a1a1aa" strokeWidth={2} />
          {/* Second cell */}
          <line x1={-1} y1={-10} x2={-1} y2={10} stroke="#a1a1aa" strokeWidth={2} />
          <line x1={1} y1={-5} x2={1} y2={5} stroke="#a1a1aa" strokeWidth={2} />
          <text x={-5} y={-12} fill="#ef4444" fontSize={7}>+</text>
          <text x={5} y={-8} fill="#71717a" fontSize={7}>−</text>
          <text x={0} y={18} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{comp.name}</text>
          <PinDot x={-25} y={0} high={true} isRunning={isRunning} />
          <PinDot x={25} y={0} high={false} isRunning={isRunning} />
        </g>
      );
    }
    case 'motor': {
      const on = isPinHigh(simPins);
      return (
        <g>
          <circle cx={0} cy={0} r={12} fill="none" stroke={on ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <text x={0} y={4} textAnchor="middle" fill={on ? '#10b981' : '#a1a1aa'} fontSize={10} fontWeight="bold">M</text>
          <line x1={-25} y1={0} x2={-12} y2={0} stroke={on ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <line x1={12} y1={0} x2={25} y2={0} stroke={on ? '#10b981' : '#a1a1aa'} strokeWidth={1.2} />
          <text x={0} y={20} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{comp.name}</text>
          <PinDot x={-25} y={0} high={on} isRunning={isRunning} />
          <PinDot x={25} y={0} high={on} isRunning={isRunning} />
        </g>
      );
    }
    case 'servo':
      return (
        <g>
          <rect x={-15} y={-10} width={30} height={20} rx={2} fill="none" stroke="#a1a1aa" strokeWidth={1.2} />
          <text x={0} y={3} textAnchor="middle" fill="#a1a1aa" fontSize={8} fontWeight="bold">S</text>
          <line x1={-25} y1={-4} x2={-15} y2={-4} stroke="#cc0000" strokeWidth={1} />
          <line x1={-25} y1={4} x2={-15} y2={4} stroke="#f97316" strokeWidth={1} />
          <line x1={15} y1={0} x2={25} y2={0} stroke="#6b7280" strokeWidth={1} />
          <text x={0} y={-14} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{comp.name}</text>
          <NetLabel x={-25} y={-8} label="SIG" isRunning={isRunning} />
          <NetLabel x={-25} y={8} label="VCC" isRunning={isRunning} />
          <NetLabel x={25} y={-5} label="GND" isRunning={isRunning} />
          <PinDot x={-25} y={-4} isRunning={isRunning} />
          <PinDot x={-25} y={4} isRunning={isRunning} />
          <PinDot x={25} y={0} isRunning={isRunning} />
        </g>
      );
    case 'photoresistor':
      return (
        <g>
          <path
            d="M-20,0 L-18,-5 L-14,5 L-10,-5 L-6,5 L-2,-5 L2,5 L6,-5 L8,0 L20,0"
            fill="none" stroke={active ? '#10b981' : '#a1a1aa'} strokeWidth={1}
          />
          {/* Light arrows */}
          <line x1={-8} y1={-14} x2={-2} y2={-8} stroke="#d4a843" strokeWidth={0.8} />
          <line x1={0} y1={-16} x2={4} y2={-8} stroke="#d4a843" strokeWidth={0.8} />
          <polygon points="-8,-14 -6,-11 -5,-14" fill="#d4a843" />
          <polygon points="0,-16 2,-13 3,-16" fill="#d4a843" />
          <text x={0} y={12} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{comp.name}</text>
          <PinDot x={-20} y={0} isRunning={isRunning} />
          <PinDot x={20} y={0} isRunning={isRunning} />
        </g>
      );
    case 'lcd':
      return (
        <g>
          <rect x={-35} y={-14} width={70} height={28} rx={2} fill="none" stroke="#a1a1aa" strokeWidth={1.2} />
          <rect x={-30} y={-10} width={60} height={20} rx={1} fill="#0a4d2e" stroke="#065f46" strokeWidth={0.5} />
          <text x={0} y={4} textAnchor="middle" fill="#33ff99" fontSize={8} fontFamily="monospace">LCD 16x2</text>
          {/* Pins on bottom */}
          {Array.from({ length: 6 }, (_, i) => (
            <g key={`lcd-sch-pin-${i}`}>
              <line x1={-25 + i * 10} y1={14} x2={-25 + i * 10} y2={22} stroke="#a1a1aa" strokeWidth={0.8} />
              <circle cx={-25 + i * 10} cy={22} r={1.5} fill="#52525b" />
            </g>
          ))}
          <text x={0} y={-18} textAnchor="middle" fill="#71717a" fontSize={7} fontFamily="monospace">{comp.name}</text>
        </g>
      );
    case 'seven_segment':
      return (
        <g>
          <rect x={-12} y={-18} width={24} height={36} rx={1} fill="none" stroke="#a1a1aa" strokeWidth={1} />
          <text x={0} y={6} textAnchor="middle" fill="#ef4444" fontSize={20} fontWeight="bold" fontFamily="monospace">8</text>
          <text x={0} y={26} textAnchor="middle" fill="#71717a" fontSize={6} fontFamily="monospace">7-SEG</text>
          <PinDot x={-18} y={-8} isRunning={isRunning} />
          <PinDot x={-18} y={0} isRunning={isRunning} />
          <PinDot x={-18} y={8} isRunning={isRunning} />
        </g>
      );
    default:
      return (
        <g>
          <rect x={-20} y={-12} width={40} height={24} rx={2} fill="none" stroke="#a1a1aa" strokeWidth={1} />
          <text x={0} y={3} textAnchor="middle" fill="#a1a1aa" fontSize={7} fontFamily="monospace">{comp.type}</text>
          <line x1={-25} y1={0} x2={-20} y2={0} stroke="#a1a1aa" strokeWidth={1} />
          <line x1={20} y1={0} x2={25} y2={0} stroke="#a1a1aa" strokeWidth={1} />
          <PinDot x={-25} y={0} isRunning={isRunning} />
          <PinDot x={25} y={0} isRunning={isRunning} />
          <text x={0} y={18} textAnchor="middle" fill="#52525b" fontSize={6}>{comp.name}</text>
        </g>
      );
  }
}

/* ================================================================== */
/*  PCB VIEW COMPONENT                                                 */
/* ================================================================== */

function PCBComponent({ comp, simPins, isRunning }: { comp: CircuitComponent; simPins?: PinState[]; isRunning: boolean }) {
  const active = isRunning && simPins?.some(p => p.value === 'high');
  const padColor = active ? '#10b981' : 'url(#copper-grad)';

  switch (comp.type) {
    case 'resistor': {
      const r = comp.props?.resistance || 220;
      return (
        <g>
          {/* SMD body */}
          <rect x={-15} y={-5} width={30} height={10} rx={1} fill="#1a1a1a" stroke="#333" strokeWidth={0.5} />
          {/* SMD pads */}
          <rect x={-18} y={-6} width={6} height={12} rx={0.5} fill={padColor} stroke="#0a3d0a" strokeWidth={0.3} />
          <rect x={12} y={-6} width={6} height={12} rx={0.5} fill={padColor} stroke="#0a3d0a" strokeWidth={0.3} />
          {/* Silkscreen outline */}
          <rect x={-15} y={-5} width={30} height={10} rx={1} fill="none" stroke="#c8c8a0" strokeWidth={0.3} />
          <SilkLabel x={0} y={2} text={r >= 1000 ? `${r / 1000}k` : `${r}`} />
          <Pad x={-25} y={0} padColor={padColor} />
          <Pad x={25} y={0} padColor={padColor} />
          {/* Copper trace stubs */}
          <line x1={-25} y1={0} x2={-18} y2={0} stroke={active ? '#10b981' : '#c87533'} strokeWidth={1.5} />
          <line x1={18} y1={0} x2={25} y2={0} stroke={active ? '#10b981' : '#c87533'} strokeWidth={1.5} />
        </g>
      );
    }
    case 'led': {
      const on = isPinHigh(simPins);
      const color = comp.props?.color || '#ef4444';
      return (
        <g>
          {/* SMD LED body */}
          <rect x={-6} y={-6} width={12} height={12} rx={1} fill={on ? color : '#222'} stroke="#444" strokeWidth={0.5} />
          {/* SMD pads */}
          <rect x={-9} y={-4} width={5} height={8} rx={0.5} fill={padColor} stroke="#0a3d0a" strokeWidth={0.3} />
          <rect x={4} y={-4} width={5} height={8} rx={0.5} fill={padColor} stroke="#0a3d0a" strokeWidth={0.3} />
          {/* LED indicator dot */}
          <circle cx={0} cy={0} r={3} fill={on ? color : '#333'} />
          {/* Silkscreen */}
          <text x={0} y={10} textAnchor="middle" fill="#c8c8a0" fontSize={4} fontFamily="monospace">D{comp.name}</text>
          {/* Polarity marker */}
          <text x={-8} y={-8} fill="#c8c8a0" fontSize={5}>+</text>
          <Pad x={-20} y={0} padColor={padColor} />
          <Pad x={20} y={0} padColor={padColor} />
          <line x1={-20} y1={0} x2={-9} y2={0} stroke={active ? '#10b981' : '#c87533'} strokeWidth={1.5} />
          <line x1={9} y1={0} x2={20} y2={0} stroke={active ? '#10b981' : '#c87533'} strokeWidth={1.5} />
          {/* Glow effect when on */}
          {on && <circle cx={0} cy={0} r={14} fill={color} opacity={0.08} filter="url(#emerald-glow)" />}
        </g>
      );
    }
    case 'capacitor': {
      const isElectrolytic = (comp.props?.capacitance || '').includes('uF') || (comp.props?.capacitance || '').includes('µF');
      if (isElectrolytic) {
        return (
          <g>
            {/* Cylindrical body */}
            <circle cx={0} cy={0} r={8} fill="#1a1a2e" stroke="#333" strokeWidth={0.5} />
            <circle cx={0} cy={0} r={8} fill="none" stroke="#c8c8a0" strokeWidth={0.3} />
            {/* Polarity stripe */}
            <path d="M-5,-8 A8,8 0 0,1 5,-8" fill="none" stroke="#c8c8a0" strokeWidth={1.5} />
            <text x={0} y={1} textAnchor="middle" fill="#c8c8a0" fontSize={4}>+</text>
            <SilkLabel x={0} y={14} text={comp.props?.capacitance || '100uF'} />
            {/* Through-hole pads */}
            <line x1={-3} y1={8} x2={-3} y2={20} stroke={active ? '#10b981' : '#c87533'} strokeWidth={1.5} />
            <line x1={3} y1={8} x2={3} y2={20} stroke={active ? '#10b981' : '#c87533'} strokeWidth={1.5} />
            <Pad x={-3} y={20} padColor={padColor} />
            <Pad x={3} y={20} padColor={padColor} />
          </g>
        );
      }
      return (
        <g>
          <rect x={-8} y={-5} width={16} height={10} rx={1} fill="#8b6914" stroke="#a07d28" strokeWidth={0.5} />
          <rect x={-8} y={-5} width={16} height={10} rx={1} fill="none" stroke="#c8c8a0" strokeWidth={0.3} />
          <rect x={-11} y={-6} width={5} height={12} rx={0.5} fill={padColor} stroke="#0a3d0a" strokeWidth={0.3} />
          <rect x={6} y={-6} width={5} height={12} rx={0.5} fill={padColor} stroke="#0a3d0a" strokeWidth={0.3} />
          <SilkLabel x={0} y={2} text={comp.props?.capacitance || '100nF'} />
          <Pad x={-20} y={0} padColor={padColor} />
          <Pad x={20} y={0} padColor={padColor} />
        </g>
      );
    }
    case 'button': {
      const pressed = isPinHigh(simPins);
      return (
        <g>
          {/* Square SMD package */}
          <rect x={-12} y={-12} width={24} height={24} rx={1} fill="#1a1a1a" stroke="#333" strokeWidth={0.5} />
          <rect x={-6} y={-6} width={12} height={12} rx={0.5} fill={pressed ? '#065f46' : '#2a2a2a'} stroke="#555" strokeWidth={0.3} />
          {/* 4 pads */}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
            <rect key={i}
              x={sx * 10 - 4} y={sy * 10 - 2} width={8} height={4}
              rx={0.5} fill={padColor} stroke="#0a3d0a" strokeWidth={0.3}
            />
          ))}
          <SilkLabel x={0} y={-16} text={comp.name} />
          {/* Center dot */}
          <circle cx={0} cy={0} r={2} fill="#444" />
        </g>
      );
    }
    default:
      return (
        <g>
          <rect x={-20} y={-12} width={40} height={24} rx={2} fill="#1a1a1a" stroke="#333" strokeWidth={0.5} />
          <rect x={-20} y={-12} width={40} height={24} rx={2} fill="none" stroke="#c8c8a0" strokeWidth={0.3} />
          <SilkLabel x={0} y={2} text={comp.type} />
          <Pad x={-25} y={0} padColor={padColor} />
          <Pad x={25} y={0} padColor={padColor} />
          <SilkLabel x={0} y={-16} text={comp.name} />
        </g>
      );
  }
}

/* ================================================================== */
/*  BREADBOARD SVG                                                     */
/* ================================================================== */

function BreadboardSVG() {
  return (
    <g>
      <rect x={50} y={50} width={700} height={400} rx={8} fill="#f5f5dc" stroke="#8b7355" strokeWidth={2} />
      <line x1={70} y1={80} x2={730} y2={80} stroke="#cc0000" strokeWidth={1.5} />
      <line x1={70} y1={100} x2={730} y2={100} stroke="#0000cc" strokeWidth={1.5} />
      <line x1={70} y1={400} x2={730} y2={400} stroke="#cc0000" strokeWidth={1.5} />
      <line x1={70} y1={420} x2={730} y2={420} stroke="#0000cc" strokeWidth={1.5} />
      <line x1={60} y1={250} x2={740} y2={250} stroke="#8b7355" strokeWidth={1} strokeDasharray="4,4" />
      {Array.from({ length: 25 }, (_, i) => (
        <g key={`row-${i}`}>
          {Array.from({ length: 30 }, (_, j) => (
            <circle
              key={`hole-${i}-${j}`}
              cx={80 + j * 20}
              cy={120 + (i < 12 ? i * 10 : (i + 2) * 10)}
              r={3}
              fill="#e8e8d0"
              stroke="#b0a890"
              strokeWidth={0.5}
            />
          ))}
        </g>
      ))}
      <text x={55} y={84} fill="#cc0000" fontSize={9} fontWeight="bold">+</text>
      <text x={55} y={104} fill="#0000cc" fontSize={9} fontWeight="bold">−</text>
      <text x={55} y={404} fill="#cc0000" fontSize={9} fontWeight="bold">+</text>
      <text x={55} y={424} fill="#0000cc" fontSize={9} fontWeight="bold">−</text>
    </g>
  );
}

/* ================================================================== */
/*  ACTIVE BOARD SVG                                                   */
/* ================================================================== */

function ActiveBoardSVG({ boardId, viewMode }: { boardId: string; viewMode: ViewMode }) {
  const board = getBoardById(boardId);
  if (!board) return null;

  const isArduino = board.id.includes('arduino');
  const isPico = board.id.includes('pico');
  const isEsp32 = board.id.includes('esp32');
  const isStm32 = board.id.includes('stm32');
  const isNodemcu = board.id.includes('nodemcu');

  if (viewMode === 'pcb') {
    return <PCBBoardSVG board={board} />;
  }

  if (isArduino) return <ArduinoBoardSVG board={board} />;
  if (isPico) return <PicoBoardSVG board={board} />;
  if (isEsp32 || isNodemcu) return <Esp32BoardSVG board={board} />;
  if (isStm32) return <Stm32BoardSVG board={board} />;

  return (
    <g transform="translate(350, 100)">
      <rect x={-35} y={-25} width={70} height={50} rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
      <text x={0} y={2} textAnchor="middle" fill="#94a3b8" fontSize={7} fontWeight="bold">{board.name}</text>
      <text x={0} y={12} textAnchor="middle" fill="#64748b" fontSize={6}>{board.mcu || ''}</text>
      {Array.from({ length: Math.min(board.pinCount.digital, 20) }, (_, i) => {
        const side = i < 10 ? -1 : 1;
        const row = i < 10 ? i : i - 10;
        return (
          <circle key={i} cx={side * 38} cy={-20 + row * 4.5} r={1.5} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
        );
      })}
    </g>
  );
}

/* --- PCB Board representation --- */
function PCBBoardSVG({ board }: { board: { name: string; mcu?: string; pinCount: { digital: number } } }) {
  return (
    <g transform="translate(350, 120)">
      {/* PCB substrate */}
      <rect x={-45} y={-30} width={90} height={60} rx={3} fill="#0a3d0a" stroke="#0d4d0d" strokeWidth={1} />
      {/* Copper pour outline */}
      <rect x={-43} y={-28} width={86} height={56} rx={2} fill="none" stroke="#c87533" strokeWidth={0.5} opacity={0.5} />
      {/* Mounting holes */}
      {[
        [-42, -27], [42, -27], [-42, 27], [42, 27],
      ].map(([x, y], i) => (
        <g key={`mh-${i}`}>
          <circle cx={x} cy={y} r={3} fill="#0a3d0a" stroke="#c87533" strokeWidth={1} />
          <circle cx={x} cy={y} r={1.5} fill="#333" />
        </g>
      ))}
      {/* MCU footprint */}
      <rect x={-12} y={-12} width={24} height={24} rx={1} fill="#1a1a1a" stroke="#444" strokeWidth={0.5} />
      <text x={0} y={2} textAnchor="middle" fill="#888" fontSize={4}>{board.mcu || 'MCU'}</text>
      {/* Pin pads */}
      {Array.from({ length: Math.min(board.pinCount.digital, 14) }, (_, i) => (
        <g key={`pcb-bp-${i}`}>
          <rect x={-40 + i * 5.5} y={-32} width={3} height={4} rx={0.5} fill="url(#copper-grad)" stroke="#0a3d0a" strokeWidth={0.3} />
          <rect x={-40 + i * 5.5} y={28} width={3} height={4} rx={0.5} fill="url(#copper-grad)" stroke="#0a3d0a" strokeWidth={0.3} />
        </g>
      ))}
      {/* Silkscreen label */}
      <text x={0} y={-18} textAnchor="middle" fill="#c8c8a0" fontSize={5} fontFamily="monospace">{board.name}</text>
    </g>
  );
}

/* --- Arduino Board --- */
function ArduinoBoardSVG({ board }: { board: { thumbnailColor: string; mcu?: string; name: string } }) {
  return (
    <g transform="translate(350, 120)">
      <rect x={-40} y={-30} width={80} height={60} rx={3} fill="#0078D7" stroke="#005A9E" strokeWidth={1.5} opacity={0.9} />
      <rect x={-36} y={-26} width={72} height={52} rx={2} fill="#005A9E" opacity={0.5} />
      <rect x={-10} y={-12} width={20} height={24} rx={1} fill="#1e293b" stroke="#475569" strokeWidth={0.5} />
      <circle cx={-6} cy={-8} r={1} fill="#334155" />
      <circle cx={6} cy={-8} r={1} fill="#334155" />
      <circle cx={-6} cy={8} r={1} fill="#334155" />
      <circle cx={6} cy={8} r={1} fill="#334155" />
      <rect x={-32} y={-24} width={14} height={10} rx={1} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
      <rect x={-30} y={-22} width={10} height={6} rx={0.5} fill="#1e293b" />
      <circle cx={20} cy={-20} r={2} fill="#22c55e" opacity={0.8} />
      <circle cx={20} cy={-20} r={4} fill="#22c55e" opacity={0.2} />
      <circle cx={26} cy={-20} r={2} fill="#eab308" opacity={0.6} />
      {Array.from({ length: 14 }, (_, i) => (
        <g key={`dp-${i}`}>
          <circle cx={-35 + i * 5} cy={-30} r={1.5} fill="#374151" stroke="#6b7280" strokeWidth={0.5} />
          <text x={-35 + i * 5} y={-34} textAnchor="middle" fill="#64748b" fontSize={4}>{i}</text>
        </g>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <g key={`ap-${i}`}>
          <circle cx={-20 + i * 5} cy={30} r={1.5} fill="#374151" stroke="#6b7280" strokeWidth={0.5} />
          <text x={-20 + i * 5} y={38} textAnchor="middle" fill="#94a3b8" fontSize={4}>A{i}</text>
        </g>
      ))}
      {['RST', '3V3', '5V', 'GND', 'VIN'].map((label, i) => (
        <g key={`pwr-${i}`}>
          <circle cx={15 + i * 5} cy={30} r={1.5} fill="#374151" stroke="#6b7280" strokeWidth={0.5} />
          <text x={15 + i * 5} y={38} textAnchor="middle" fill="#f87171" fontSize={3}>{label}</text>
        </g>
      ))}
      <rect x={-38} y={0} width={8} height={6} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      {Array.from({ length: 3 }, (_, i) => (
        <circle key={`icsp-${i}`} cx={-35 + i * 2.5} cy={1.5} r={0.8} fill="#475569" />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <circle key={`icsp2-${i}`} cx={-35 + i * 2.5} cy={4.5} r={0.8} fill="#475569" />
      ))}
      <circle cx={-35} cy={24} r={3} fill="none" stroke="#005A9E" strokeWidth={0.8} />
      <circle cx={35} cy={24} r={3} fill="none" stroke="#005A9E" strokeWidth={0.8} />
      <text x={0} y={-18} textAnchor="middle" fill="#e2e8f0" fontSize={5} fontWeight="bold">ARDUINO UNO</text>
      <text x={0} y={20} textAnchor="middle" fill="#94a3b8" fontSize={4}>{board.mcu || 'ATmega328P'}</text>
    </g>
  );
}

/* --- Pico Board --- */
function PicoBoardSVG({ board }: { board: { thumbnailColor: string; mcu?: string; name: string } }) {
  return (
    <g transform="translate(350, 120)">
      <rect x={-45} y={-10} width={90} height={20} rx={2} fill="#1B5E20" stroke="#2E7D32" strokeWidth={1.5} />
      <rect x={-44} y={-5} width={8} height={10} rx={1} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
      <circle cx={-30} cy={5} r={2.5} fill="#374151" stroke="#6b7280" strokeWidth={0.5} />
      <text x={-30} y={6.5} textAnchor="middle" fill="#9ca3af" fontSize={3}>B</text>
      <circle cx={-22} cy={-5} r={1.5} fill="#22c55e" opacity={0.8} />
      <rect x={-5} y={-7} width={16} height={14} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      {Array.from({ length: 20 }, (_, i) => {
        const side = i < 10 ? -1 : 1;
        const row = i < 10 ? i : i - 10;
        return <circle key={i} cx={side * 44} cy={-8 + row * 1.8} r={1.2} fill="#374151" stroke="#6b7280" strokeWidth={0.3} />;
      })}
      <text x={15} y={2} textAnchor="middle" fill="#a5d6a7" fontSize={5} fontWeight="bold">PICO</text>
    </g>
  );
}

/* --- ESP32 Board --- */
function Esp32BoardSVG({ board }: { board: { thumbnailColor: string; mcu?: string; name: string } }) {
  return (
    <g transform="translate(350, 120)">
      <rect x={-40} y={-20} width={80} height={40} rx={3} fill="#E65100" stroke="#BF360C" strokeWidth={1.5} opacity={0.9} />
      <rect x={-35} y={-14} width={12} height={8} rx={1} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
      <rect x={15} y={-16} width={20} height={12} rx={1} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      <text x={25} y={-9} textAnchor="middle" fill="#64748b" fontSize={4}>ANT</text>
      <rect x={-8} y={-10} width={16} height={20} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      <circle cx={18} cy={-8} r={1.5} fill="#22c55e" opacity={0.8} />
      <circle cx={24} cy={-8} r={1.5} fill="#3b82f6" opacity={0.8} />
      {Array.from({ length: 18 }, (_, i) => {
        const side = i < 9 ? -1 : 1;
        const row = i < 9 ? i : i - 9;
        return <circle key={i} cx={side * 39} cy={-15 + row * 3.5} r={1.3} fill="#374151" stroke="#6b7280" strokeWidth={0.3} />;
      })}
      <text x={-15} y={14} textAnchor="middle" fill="#ffcc80" fontSize={5} fontWeight="bold">ESP32</text>
      <text x={-15} y={19} textAnchor="middle" fill="#ffab40" fontSize={3}>{board.mcu || 'WROOM-32'}</text>
    </g>
  );
}

/* --- STM32 Board --- */
function Stm32BoardSVG({ board }: { board: { thumbnailColor: string; mcu?: string; name: string } }) {
  return (
    <g transform="translate(350, 100)">
      <rect x={-35} y={-35} width={70} height={70} rx={3} fill="#4527A0" stroke="#311B92" strokeWidth={1.5} opacity={0.9} />
      <rect x={-28} y={-32} width={12} height={8} rx={1} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
      <rect x={-12} y={-14} width={24} height={28} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      <text x={0} y={2} textAnchor="middle" fill="#64748b" fontSize={4}>{board.mcu || 'STM32'}</text>
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={`a-${i}`} cx={-30 + i * 4} cy={-35} r={1.3} fill="#374151" stroke="#6b7280" strokeWidth={0.3} />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={`b-${i}`} cx={-30 + i * 4} cy={35} r={1.3} fill="#374151" stroke="#6b7280" strokeWidth={0.3} />
      ))}
      {Array.from({ length: 20 }, (_, i) => (
        <circle key={`m-${i}`} cx={35} cy={-25 + i * 2.5} r={1} fill="#374151" stroke="#6b7280" strokeWidth={0.2} />
      ))}
      <circle cx={20} cy={-25} r={1.5} fill="#22c55e" opacity={0.8} />
      <circle cx={25} cy={-25} r={1.5} fill="#3b82f6" opacity={0.6} />
      <text x={0} y={-20} textAnchor="middle" fill="#d1c4e9" fontSize={4} fontWeight="bold">NUCLEO</text>
    </g>
  );
}
