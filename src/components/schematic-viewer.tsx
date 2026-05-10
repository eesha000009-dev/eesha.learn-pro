'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { BoardSVGSelector } from '@/components/boards/BoardSVG';
import { getBoardPinout } from '@/lib/board-pinouts';
import {
  calculateWireRoute,
  findNearestPin,
  hitTestWire,
  createWireId,
  isPinConnected,
  removeWiresForComponent,
  type PlacedComponent,
  type Wire,
} from '@/lib/wiring-engine';
import { componentLibrary } from '@/lib/components';
import type { PinState } from '@/types';

/* ================================================================ */
/*  Constants                                                        */
/* ================================================================ */

const BOARD_X = 200;
const BOARD_Y = 80;
const BOARD_U = 10;
const GRID_SIZE = 20;
const GRID_DOT_R = 1;
const SNAP_THRESHOLD = 25;
const WIRE_HIT_TOLERANCE = 8;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

/* ================================================================ */
/*  Component pin layouts (relative to component center)              */
/* ================================================================ */

interface PinLayout {
  id: string;
  name: string;
  x: number;
  y: number;
  side: string;
  type: string;
}

const COMPONENT_PIN_LAYOUTS: Record<string, PinLayout[]> = {
  led: [
    { id: 'anode', name: 'A', x: -28, y: 0, side: 'left', type: 'digital' },
    { id: 'cathode', name: 'K', x: 28, y: 0, side: 'right', type: 'digital' },
  ],
  rgb_led: [
    { id: 'red', name: 'R', x: -28, y: -8, side: 'left', type: 'digital' },
    { id: 'common', name: 'COM', x: -28, y: 8, side: 'left', type: 'ground' },
    { id: 'green', name: 'G', x: 28, y: -8, side: 'right', type: 'digital' },
    { id: 'blue', name: 'B', x: 28, y: 8, side: 'right', type: 'digital' },
  ],
  resistor: [
    { id: 'pin1', name: '1', x: -32, y: 0, side: 'left', type: 'digital' },
    { id: 'pin2', name: '2', x: 32, y: 0, side: 'right', type: 'digital' },
  ],
  capacitor: [
    { id: 'positive', name: '+', x: -22, y: 0, side: 'left', type: 'power' },
    { id: 'negative', name: '−', x: 22, y: 0, side: 'right', type: 'ground' },
  ],
  button: [
    { id: 'pin1', name: '1', x: -22, y: -6, side: 'left', type: 'digital' },
    { id: 'pin2', name: '2', x: -22, y: 6, side: 'left', type: 'digital' },
    { id: 'pin3', name: '3', x: 22, y: -6, side: 'right', type: 'digital' },
    { id: 'pin4', name: '4', x: 22, y: 6, side: 'right', type: 'digital' },
  ],
  potentiometer: [
    { id: 'pin1', name: '1', x: -16, y: -10, side: 'left', type: 'digital' },
    { id: 'wiper', name: 'W', x: 0, y: 16, side: 'bottom', type: 'analog' },
    { id: 'pin3', name: '3', x: 16, y: -10, side: 'right', type: 'digital' },
  ],
  buzzer: [
    { id: 'positive', name: '+', x: -20, y: 6, side: 'left', type: 'power' },
    { id: 'negative', name: '−', x: 20, y: 6, side: 'right', type: 'ground' },
  ],
  battery: [
    { id: 'positive', name: '+', x: -18, y: -6, side: 'left', type: 'power' },
    { id: 'negative', name: '−', x: 18, y: -6, side: 'right', type: 'ground' },
  ],
  motor: [
    { id: 'positive', name: '+', x: -18, y: 6, side: 'left', type: 'power' },
    { id: 'negative', name: '−', x: 18, y: 6, side: 'right', type: 'ground' },
  ],
  servo: [
    { id: 'vcc', name: 'VCC', x: -28, y: -10, side: 'left', type: 'power' },
    { id: 'signal', name: 'SIG', x: -28, y: 0, side: 'left', type: 'digital' },
    { id: 'gnd', name: 'GND', x: -28, y: 10, side: 'left', type: 'ground' },
  ],
  photoresistor: [
    { id: 'pin1', name: '1', x: -22, y: 0, side: 'left', type: 'analog' },
    { id: 'pin2', name: '2', x: 22, y: 0, side: 'right', type: 'analog' },
  ],
  lcd: Array.from({ length: 6 }, (_, i) => ({
    id: `pin${i + 1}`,
    name: `P${i + 1}`,
    x: -40 + i * 16,
    y: 24,
    side: 'bottom' as string,
    type: 'digital' as string,
  })),
  seven_segment: Array.from({ length: 10 }, (_, i) => ({
    id: `pin${i + 1}`,
    name: `P${i + 1}`,
    x: i < 5 ? -18 : 18,
    y: -18 + (i % 5) * 9,
    side: (i < 5 ? 'left' : 'right') as string,
    type: 'digital' as string,
  })),
  relay: [
    { id: 'vcc', name: 'VCC', x: -18, y: -8, side: 'left', type: 'power' },
    { id: 'gnd', name: 'GND', x: -18, y: 8, side: 'left', type: 'ground' },
    { id: 'signal', name: 'SIG', x: 18, y: 0, side: 'right', type: 'digital' },
  ],
  transistor: [
    { id: 'base', name: 'B', x: -20, y: 8, side: 'left', type: 'digital' },
    { id: 'collector', name: 'C', x: 0, y: -20, side: 'top', type: 'digital' },
    { id: 'emitter', name: 'E', x: 0, y: 20, side: 'bottom', type: 'digital' },
  ],
  diode: [
    { id: 'anode', name: 'A', x: -22, y: 0, side: 'left', type: 'digital' },
    { id: 'cathode', name: 'K', x: 22, y: 0, side: 'right', type: 'digital' },
  ],
};

/* ================================================================ */
/*  Helpers                                                          */
/* ================================================================ */

function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

function screenToCanvas(
  clientX: number,
  clientY: number,
  containerRef: React.RefObject<HTMLDivElement | null>,
  offsetX: number,
  offsetY: number,
  zoom: number,
): { x: number; y: number } {
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: (clientX - rect.left - offsetX) / zoom,
    y: (clientY - rect.top - offsetY) / zoom,
  };
}

function routeToPathD(route: { x: number; y: number }[]): string {
  return route.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function isPinHigh(pins: PinState[] | undefined): boolean {
  return pins?.[0]?.value === 'high';
}

const WIRE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#14b8a6',
];
function wireColorFor(index: number): string {
  return WIRE_COLORS[index % WIRE_COLORS.length];
}

/* ================================================================ */
/*  Module-level sub-components                                       */
/* ================================================================ */

function WirePath({
  wire,
  isSelected,
  onClick,
}: {
  wire: Wire;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const color = wire.isPowered ? '#10b981' : wire.color;
  const width = isSelected ? 3.5 : 2;
  const opacity = wire.isPowered ? 1 : 0.7;
  const d = routeToPathD(wire.route);

  return (
    <g>
      {wire.isPowered && (
        <path d={d} stroke="#10b981" strokeWidth={width + 4} fill="none" opacity={0.15} />
      )}
      <path
        d={d}
        stroke={color}
        strokeWidth={width}
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="cursor-pointer"
        onClick={onClick}
      />
      {isSelected && (
        <path
          d={d}
          stroke="#10b981"
          strokeWidth={width + 2}
          fill="none"
          opacity={0.3}
          strokeDasharray="6,3"
          className="pointer-events-none"
        />
      )}
    </g>
  );
}

function ActiveWirePath({
  fromX,
  fromY,
  toX,
  toY,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}) {
  const route = calculateWireRoute({ x: fromX, y: fromY }, { x: toX, y: toY });
  const d = routeToPathD(route);
  return (
    <path
      d={d}
      stroke="#10b981"
      strokeWidth={2.5}
      fill="none"
      strokeDasharray="8,5"
      opacity={0.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none"
    />
  );
}

function SnapRing({ cx, cy }: { cx: number; cy: number }) {
  return (
    <circle
      cx={cx} cy={cy}
      r={8}
      fill="none"
      stroke="#10b981"
      strokeWidth={2}
      opacity={0.5}
      className="pointer-events-none"
    >
      <animate attributeName="r" values="6;11;6" dur="1s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite" />
    </circle>
  );
}

function ComponentPinDot({
  x,
  y,
  label,
  isHovered,
  isConnected,
  isPowered,
  onMouseDown,
}: {
  x: number;
  y: number;
  label: string;
  isHovered: boolean;
  isConnected: boolean;
  isPowered: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const r = isHovered ? 5.5 : 4;
  const fill = isPowered ? '#10b981' : isConnected ? '#f59e0b' : '#3f3f46';
  const stroke = isPowered ? '#064e3b' : isConnected ? '#b45309' : '#52525b';

  return (
    <g className="cursor-pointer" onMouseDown={onMouseDown}>
      {isHovered && (
        <circle cx={x} cy={y} r={r + 4} fill="#10b981" opacity={0.12} className="pointer-events-none" />
      )}
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={1.2} />
      {isHovered && (
        <text
          x={x} y={y - 10}
          textAnchor="middle"
          fill="#d4d4d8"
          fontSize={7}
          fontFamily="monospace"
          className="pointer-events-none"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function CanvasComponent({
  comp,
  isSelected,
  isDragging,
  simPins,
  hoveredPinId,
  connectedPins,
  onPinMouseDown,
  onComponentMouseDown,
}: {
  comp: { id: string; type: string; name: string; x: number; y: number; rotation: number; props?: Record<string, unknown> };
  isSelected: boolean;
  isDragging: boolean;
  simPins?: PinState[];
  hoveredPinId: string | null;
  connectedPins: Set<string>;
  onPinMouseDown: (componentId: string, pinId: string, canvasX: number, canvasY: number) => void;
  onComponentMouseDown: (e: React.MouseEvent, componentId: string) => void;
}) {
  const layout = COMPONENT_PIN_LAYOUTS[comp.type] || [];
  const on = isPinHigh(simPins);

  return (
    <g
      transform={`translate(${comp.x}, ${comp.y}) rotate(${comp.rotation})`}
      opacity={isDragging ? 0.4 : 1}
    >
      {/* Component body */}
      <g
        className="cursor-pointer"
        onMouseDown={(e) => {
          if ((e.target as SVGElement).dataset.pinId) return;
          onComponentMouseDown(e, comp.id);
        }}
      >
        <ComponentBody comp={comp} on={on} simPins={simPins} />
      </g>

      {/* Pin dots */}
      {layout.map((pin) => {
        const globalPinId = `${comp.id}:${pin.id}`;
        const isHov = hoveredPinId === globalPinId;
        const isConn = connectedPins.has(globalPinId);
        const pinState = simPins?.find((p) => p.pinName === pin.id || p.pinName === pin.name);
        const isPow = pinState?.value === 'high';
        return (
          <ComponentPinDot
            key={pin.id}
            x={pin.x}
            y={pin.y}
            label={pin.name}
            isHovered={isHov}
            isConnected={isConn}
            isPowered={isPow}
            onMouseDown={(e) => {
              e.stopPropagation();
              onPinMouseDown(comp.id, pin.id, comp.x + pin.x, comp.y + pin.y);
            }}
          />
        );
      })}

      {/* Selection outline */}
      {isSelected && (
        <rect
          x={-36} y={-22}
          width={72} height={44}
          fill="none"
          stroke="#10b981"
          strokeWidth={1.5}
          strokeDasharray="5,3"
          rx={4}
          className="pointer-events-none"
        />
      )}

      {/* Component label */}
      <text
        x={0} y={30}
        textAnchor="middle"
        fill="#71717a"
        fontSize={6}
        fontFamily="monospace"
        className="pointer-events-none"
      >
        {comp.name}
      </text>
    </g>
  );
}

function ComponentBody({
  comp,
  on,
  simPins,
}: {
  comp: { type: string; props?: Record<string, unknown> };
  on: boolean;
  simPins?: PinState[];
}) {
  switch (comp.type) {
    case 'led': {
      const color = (comp.props?.color as string) || '#ef4444';
      return (
        <g className="pointer-events-none">
          {on && <circle cx={0} cy={0} r={18} fill={color} opacity={0.15} />}
          <circle cx={0} cy={0} r={10} fill={on ? color : '#27272a'} stroke={color} strokeWidth={1.5} opacity={on ? 1 : 0.6} />
          <line x1={-28} y1={0} x2={-10} y2={0} stroke="#a1a1aa" strokeWidth={1.5} />
          <line x1={10} y1={0} x2={28} y2={0} stroke="#a1a1aa" strokeWidth={1.5} />
          {on && (
            <>
              <line x1={6} y1={-10} x2={10} y2={-14} stroke={color} strokeWidth={1} opacity={0.7} />
              <line x1={8} y1={-12} x2={12} y2={-12} stroke={color} strokeWidth={1} opacity={0.7} />
              <line x1={6} y1={-10} x2={8} y2={-14} stroke={color} strokeWidth={1} opacity={0.5} />
            </>
          )}
        </g>
      );
    }
    case 'rgb_led': {
      const rOn = simPins?.find((p) => p.pinName === 'red' || p.pinName === 'R')?.value === 'high';
      const gOn = simPins?.find((p) => p.pinName === 'green' || p.pinName === 'G')?.value === 'high';
      const bOn = simPins?.find((p) => p.pinName === 'blue' || p.pinName === 'B')?.value === 'high';
      const mix = `rgb(${rOn ? 255 : 40}, ${gOn ? 255 : 40}, ${bOn ? 255 : 40})`;
      const isOn = rOn || gOn || bOn;
      return (
        <g className="pointer-events-none">
          {isOn && <circle cx={0} cy={0} r={16} fill={mix} opacity={0.15} />}
          <circle cx={0} cy={0} r={11} fill={isOn ? mix : '#27272a'} stroke="#71717a" strokeWidth={1.2} />
          <text x={0} y={3} textAnchor="middle" fill={isOn ? '#fff' : '#52525b'} fontSize={6} fontWeight="bold">RGB</text>
        </g>
      );
    }
    case 'resistor': {
      const r = (comp.props?.resistance as number) || 220;
      const label = r >= 1000 ? `${r / 1000}kΩ` : `${r}Ω`;
      const pts = 'M-32,0 L-24,0 L-22,-6 L-18,6 L-14,-6 L-10,6 L-6,-6 L-2,6 L2,-6 L6,6 L10,-6 L14,6 L18,-6 L22,6 L24,0 L32,0';
      return (
        <g className="pointer-events-none">
          <path d={pts} fill="none" stroke="#d4a843" strokeWidth={1.8} />
          <text x={0} y={-12} textAnchor="middle" fill="#a1a1aa" fontSize={7}>{label}</text>
        </g>
      );
    }
    case 'capacitor': {
      return (
        <g className="pointer-events-none">
          <line x1={-22} y1={0} x2={-4} y2={0} stroke="#a1a1aa" strokeWidth={1.5} />
          <line x1={4} y1={0} x2={22} y2={0} stroke="#a1a1aa" strokeWidth={1.5} />
          <path d="M-4,-10 Q0,-7 4,-10" fill="none" stroke="#d4a843" strokeWidth={2} />
          <line x1={-4} y1={10} x2={-4} y2={-8} stroke="#d4a843" strokeWidth={2} />
          <text x={0} y={16} textAnchor="middle" fill="#71717a" fontSize={6}>{(comp.props?.capacitance as string) || '100µF'}</text>
        </g>
      );
    }
    case 'button': {
      const pressed = isPinHigh(simPins);
      return (
        <g className="pointer-events-none">
          <rect x={-16} y={-12} width={32} height={24} rx={3} fill="#27272a" stroke={pressed ? '#10b981' : '#52525b'} strokeWidth={1.5} />
          <rect x={-10} y={-8} width={20} height={16} rx={2} fill={pressed ? '#064e3b' : '#3f3f46'} stroke="#71717a" strokeWidth={0.5} />
          <text x={0} y={3} textAnchor="middle" fill="#a1a1aa" fontSize={6}>{pressed ? 'ON' : 'BTN'}</text>
        </g>
      );
    }
    case 'buzzer': {
      const buzzing = isPinHigh(simPins);
      return (
        <g className="pointer-events-none">
          <circle cx={0} cy={0} r={12} fill="#18181b" stroke={buzzing ? '#f59e0b' : '#52525b'} strokeWidth={1.5} />
          <circle cx={0} cy={0} r={6} fill="#0a0a0a" />
          <text x={0} y={3} textAnchor="middle" fill={buzzing ? '#f59e0b' : '#52525b'} fontSize={7} fontWeight="bold">BZ</text>
          {buzzing && (
            <text x={16} y={-12} fill="#f59e0b" fontSize={10} className="pointer-events-none">♪</text>
          )}
        </g>
      );
    }
    case 'battery': {
      const v = (comp.props?.voltage as number) || 9;
      return (
        <g className="pointer-events-none">
          <rect x={-14} y={-14} width={28} height={28} rx={3} fill="#1e293b" stroke="#3b82f6" strokeWidth={1.2} />
          <rect x={-3} y={-17} width={6} height={3} fill="#3b82f6" />
          <text x={0} y={3} textAnchor="middle" fill="#60a5fa" fontSize={7} fontWeight="bold">{v}V</text>
        </g>
      );
    }
    case 'servo': {
      return (
        <g className="pointer-events-none">
          <rect x={-20} y={-14} width={40} height={28} rx={3} fill="#1e3a8a" stroke="#3b82f6" strokeWidth={1} />
          <circle cx={4} cy={0} r={6} fill="#1e3a8a" stroke="#60a5fa" strokeWidth={1} />
          <line x1={4} y1={0} x2={9} y2={0} stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    }
    case 'motor': {
      return (
        <g className="pointer-events-none">
          <circle cx={0} cy={0} r={14} fill="#27272a" stroke="#52525b" strokeWidth={1.5} />
          <circle cx={0} cy={0} r={6} fill="#18181b" stroke="#71717a" strokeWidth={1} />
          <text x={0} y={3} textAnchor="middle" fill="#a1a1aa" fontSize={8}>M</text>
        </g>
      );
    }
    case 'photoresistor': {
      return (
        <g className="pointer-events-none">
          <circle cx={0} cy={0} r={10} fill="#78350f" stroke="#92400e" strokeWidth={1.5} opacity={0.8} />
          <path d="M-4,-3 Q0,-6 4,-3 Q0,5 -4,3Z" fill="#b45309" opacity={0.6} />
          <line x1={-22} y1={0} x2={-10} y2={0} stroke="#a1a1aa" strokeWidth={1.5} />
          <line x1={10} y1={0} x2={22} y2={0} stroke="#a1a1aa" strokeWidth={1.5} />
        </g>
      );
    }
    case 'potentiometer': {
      return (
        <g className="pointer-events-none">
          <circle cx={0} cy={0} r={12} fill="#27272a" stroke="#52525b" strokeWidth={1.5} />
          <line x1={0} y1={0} x2={8} y2={-8} stroke="#d4a843" strokeWidth={2} strokeLinecap="round" />
          <circle cx={0} cy={0} r={3} fill="#52525b" />
        </g>
      );
    }
    default:
      return (
        <g className="pointer-events-none">
          <rect x={-22} y={-14} width={44} height={28} rx={3} fill="#27272a" stroke="#52525b" strokeWidth={1} />
          <text x={0} y={3} textAnchor="middle" fill="#a1a1aa" fontSize={7}>{comp.type}</text>
        </g>
      );
  }
}

function ContextMenuItem({
  label,
  shortcut,
  onClick,
  danger,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[10px] text-zinc-500 ml-4">{shortcut}</span>}
    </button>
  );
}

/* ================================================================ */
/*  MAIN COMPONENT                                                    */
/* ================================================================ */

export function SchematicViewer({ className = '' }: { className?: string }) {
  const {
    components,
    wires,
    activeWire,
    selectedWireId,
    selectedComponentId,
    simulation,
    boardType,
    zoom,
    setZoom,
    showGrid,
    toggleGrid,
    addComponent,
    removeComponent,
    updateComponent,
    setSelectedComponent,
    setSelectedWire,
    addWire,
    removeWire,
    setActiveWire,
    clearWires,
  } = useSimulatorStore();

  /* --- local state --- */
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 60, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [snapTarget, setSnapTarget] = useState<{ componentId: string; pinId: string; x: number; y: number } | null>(null);
  const [draggingComponent, setDraggingComponent] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; componentId: string } | null>(null);

  /* --- derived --- */
  const isRunning = simulation.isRunning;

  /* --- build all wireable pins for snap/hit testing --- */
  const allWireableComponents = useMemo((): PlacedComponent[] => {
    const result: PlacedComponent[] = [];

    // Board pins
    const boardPinout = getBoardPinout(boardType);
    if (boardPinout) {
      result.push({
        id: `board-${boardType}`,
        type: 'board',
        name: boardPinout.boardName,
        x: BOARD_X,
        y: BOARD_Y,
        rotation: 0,
        pins: boardPinout.pins.map((p) => ({
          id: p.id,
          name: p.name,
          x: BOARD_X + p.x * BOARD_U,
          y: BOARD_Y + p.y * BOARD_U,
          side: p.side,
          type: p.type,
        })),
      });
    }

    // Placed components
    for (const comp of components) {
      const layout = COMPONENT_PIN_LAYOUTS[comp.type] || [];
      result.push({
        id: comp.id,
        type: comp.type,
        name: comp.name,
        x: comp.x,
        y: comp.y,
        rotation: comp.rotation,
        pins: layout.map((p) => ({
          id: p.id,
          name: p.name,
          x: comp.x + p.x,
          y: comp.y + p.y,
          side: p.side,
          type: p.type,
        })),
      });
    }

    return result;
  }, [boardType, components]);

  // Set of globally connected pins for visual feedback
  const connectedPinSet = useMemo(() => {
    const s = new Set<string>();
    for (const w of wires) {
      s.add(`${w.fromComponentId}:${w.fromPinId}`);
      s.add(`${w.toComponentId}:${w.toPinId}`);
    }
    return s;
  }, [wires]);

  // Board pin states for BoardSVGSelector
  const boardPinStatesMap = useMemo(() => {
    const map: Record<string, { value: 'high' | 'low'; voltage: number }> = {};
    const simPins = simulation.pinStates[boardType];
    if (simPins) {
      for (const pin of simPins) {
        map[pin.pinName] = {
          value: pin.value === 'floating' ? 'low' : pin.value,
          voltage: pin.voltage || 0,
        };
      }
    }
    return map;
  }, [simulation.pinStates, boardType]);

  /* ============ PIN CLICK HANDLER ============ */
  const handlePinClick = useCallback(
    (componentId: string, pinId: string, canvasX: number, canvasY: number) => {
      if (activeWire) {
        // Complete the wire
        const wiringState = { wires, activeWire: null, selectedWireId };
        if (isPinConnected(wiringState, componentId, pinId)) {
          setActiveWire(null);
          setSnapTarget(null);
          return;
        }
        if (componentId === activeWire.fromComponentId && pinId === activeWire.fromPinId) {
          setActiveWire(null);
          setSnapTarget(null);
          return;
        }
        // Check duplicate
        const exists = wires.some(
          (w) =>
            (w.fromComponentId === activeWire.fromComponentId && w.fromPinId === activeWire.fromPinId && w.toComponentId === componentId && w.toPinId === pinId) ||
            (w.fromComponentId === componentId && w.fromPinId === pinId && w.toComponentId === activeWire.fromComponentId && w.toPinId === activeWire.fromPinId),
        );
        if (exists) {
          setActiveWire(null);
          setSnapTarget(null);
          return;
        }

        const newWire: Wire = {
          id: createWireId(),
          fromComponentId: activeWire.fromComponentId,
          fromPinId: activeWire.fromPinId,
          toComponentId: componentId,
          toPinId: pinId,
          color: wireColorFor(wires.length),
          route: calculateWireRoute(
            { x: activeWire.fromX, y: activeWire.fromY },
            { x: canvasX, y: canvasY },
          ),
          isPowered: false,
          voltage: 0,
        };
        addWire(newWire);
        setActiveWire(null);
        setSnapTarget(null);
        setHoveredPinId(null);
      } else {
        // Start drawing wire
        setActiveWire({
          fromComponentId: componentId,
          fromPinId: pinId,
          fromX: canvasX,
          fromY: canvasY,
          toX: canvasX,
          toY: canvasY,
        });
        setSelectedWire(null);
        setSelectedComponent(null);
      }
    },
    [activeWire, wires, selectedWireId, addWire, setActiveWire, setSelectedWire, setSelectedComponent],
  );

  /* ============ BOARD PIN CLICK (converts board-local to canvas coords) ============ */
  const handleBoardPinClick = useCallback(
    (pinId: string, boardLocalX: number, boardLocalY: number) => {
      const canvasX = boardLocalX + BOARD_X;
      const canvasY = boardLocalY + BOARD_Y;
      handlePinClick(`board-${boardType}`, pinId, canvasX, canvasY);
    },
    [boardType, handlePinClick],
  );

  /* ============ CANVAS MOUSE MOVE ============ */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = screenToCanvas(e.clientX, e.clientY, containerRef, offset.x, offset.y, zoom);

      // Panning
      if (isPanning) {
        setOffset({
          x: panStart.startOffsetX + (e.clientX - panStart.startX),
          y: panStart.startOffsetY + (e.clientY - panStart.startY),
        });
        return;
      }

      // Active wire drawing
      if (activeWire) {
        const snap = findNearestPin(canvas.x, canvas.y, allWireableComponents, SNAP_THRESHOLD);
        const tx = snap ? snap.x : canvas.x;
        const ty = snap ? snap.y : canvas.y;
        setActiveWire({ ...activeWire, toX: tx, toY: ty });
        setSnapTarget(snap);

        // Update hovered pin for feedback
        if (snap) {
          setHoveredPinId(`${snap.componentId}:${snap.pinId}`);
        } else {
          setHoveredPinId(null);
        }
        return;
      }

      // Component dragging
      if (draggingComponent) {
        let nx = canvas.x - draggingComponent.offsetX;
        let ny = canvas.y - draggingComponent.offsetY;
        nx = snapToGrid(nx);
        ny = snapToGrid(ny);
        updateComponent(draggingComponent.id, { x: nx, y: ny });
        return;
      }

      // Hover detection for component pins
      const snap = findNearestPin(canvas.x, canvas.y, allWireableComponents, SNAP_THRESHOLD);
      setHoveredPinId(snap ? `${snap.componentId}:${snap.pinId}` : null);
    },
    [isPanning, panStart, activeWire, draggingComponent, allWireableComponents, zoom, offset, updateComponent, setActiveWire],
  );

  /* ============ CANVAS MOUSE DOWN ============ */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle click or space+click → start panning
      if (e.button === 1 || (spaceDown && e.button === 0)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ startX: e.clientX, startY: e.clientY, startOffsetX: offset.x, startOffsetY: offset.y });
        return;
      }

      if (e.button === 0 && !e.shiftKey) {
        const canvas = screenToCanvas(e.clientX, e.clientY, containerRef, offset.x, offset.y, zoom);

        // If wiring and clicked on empty space → cancel
        if (activeWire) {
          // Check if near a pin (handled by pin click handlers)
          const snap = findNearestPin(canvas.x, canvas.y, allWireableComponents, SNAP_THRESHOLD);
          if (!snap) {
            setActiveWire(null);
            setSnapTarget(null);
            setHoveredPinId(null);
          }
          return;
        }

        // Check if clicked on a wire
        for (const wire of wires) {
          if (hitTestWire(canvas.x, canvas.y, wire, WIRE_HIT_TOLERANCE)) {
            setSelectedWire(wire.id);
            setSelectedComponent(null);
            return;
          }
        }

        // Deselect
        setSelectedWire(null);
        setSelectedComponent(null);
      }
    },
    [spaceDown, offset, zoom, activeWire, wires, allWireableComponents, setSelectedWire, setSelectedComponent, setActiveWire],
  );

  /* ============ CANVAS MOUSE UP ============ */
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingComponent(null);
  }, []);

  /* ============ COMPONENT MOUSE DOWN (start drag) ============ */
  const handleComponentMouseDown = useCallback(
    (e: React.MouseEvent, componentId: string) => {
      if (e.button !== 0) return;
      if (activeWire) return;
      e.stopPropagation();
      setSelectedComponent(componentId);
      setSelectedWire(null);

      const canvas = screenToCanvas(e.clientX, e.clientY, containerRef, offset.x, offset.y, zoom);
      const comp = components.find((c) => c.id === componentId);
      if (!comp) return;

      setDraggingComponent({
        id: componentId,
        offsetX: canvas.x - comp.x,
        offsetY: canvas.y - comp.y,
      });
    },
    [activeWire, components, offset, zoom, setSelectedComponent, setSelectedWire],
  );

  /* ============ COMPONENT PIN MOUSE DOWN (start/complete wire) ============ */
  const handleComponentPinMouseDown = useCallback(
    (componentId: string, pinId: string, canvasX: number, canvasY: number) => {
      handlePinClick(componentId, pinId, canvasX, canvasY);
    },
    [handlePinClick],
  );

  /* ============ MOUSE WHEEL ZOOM ============ */
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
      setOffset({
        x: mx - (mx - offset.x) * scale,
        y: my - (my - offset.y) * scale,
      });
      setZoom(newZoom);
    },
    [zoom, offset, setZoom],
  );

  /* ============ KEYBOARD ============ */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setSpaceDown(true);
      }
      if (e.key === 'Escape') {
        setActiveWire(null);
        setSnapTarget(null);
        setSelectedWire(null);
        setSelectedComponent(null);
        setContextMenu(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (contextMenu) return;
        if (selectedWireId) {
          removeWire(selectedWireId);
          setSelectedWire(null);
        } else if (selectedComponentId) {
          // Remove wires for this component
          const wiringState = { wires, activeWire: null, selectedWireId };
          const updated = removeWiresForComponent(wiringState, selectedComponentId);
          // Remove all wires that were connected
          for (const w of wires) {
            if (w.fromComponentId === selectedComponentId || w.toComponentId === selectedComponentId) {
              removeWire(w.id);
            }
          }
          removeComponent(selectedComponentId);
          setSelectedComponent(null);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedWireId, selectedComponentId, wires, contextMenu, removeWire, removeComponent, setActiveWire, setSelectedWire, setSelectedComponent]);

  /* Close context menu on click */
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  /* ============ CONTEXT MENU ============ */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, componentId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedComponent(componentId);
      setContextMenu({ x: e.clientX, y: e.clientY, componentId });
    },
    [setSelectedComponent],
  );

  const contextDuplicate = useCallback(() => {
    if (!contextMenu) return;
    const comp = components.find((c) => c.id === contextMenu.componentId);
    if (!comp) return;
    const def = componentLibrary.find((d) => d.type === comp.type);
    addComponent({
      ...comp,
      id: `${comp.type}-${Date.now()}`,
      name: `${def?.name || comp.type} (copy)`,
      x: comp.x + GRID_SIZE * 3,
      y: comp.y + GRID_SIZE * 3,
    });
    setContextMenu(null);
  }, [contextMenu, components, addComponent]);

  const contextDelete = useCallback(() => {
    if (!contextMenu) return;
    const cid = contextMenu.componentId;
    for (const w of wires) {
      if (w.fromComponentId === cid || w.toComponentId === cid) {
        removeWire(w.id);
      }
    }
    removeComponent(cid);
    setSelectedComponent(null);
    setContextMenu(null);
  }, [contextMenu, wires, removeWire, removeComponent, setSelectedComponent]);

  /* ============ DROP HANDLER (from component palette) ============ */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/component-type');
      if (!data) return;
      let parsed: { type: string; name: string } | null = null;
      try {
        parsed = JSON.parse(data);
      } catch {
        // Try plain string
        const def = componentLibrary.find((d) => d.type === data);
        if (def) parsed = { type: def.type, name: def.name };
      }
      if (!parsed) return;

      const canvas = screenToCanvas(e.clientX, e.clientY, containerRef, offset.x, offset.y, zoom);
      const newId = `${parsed.type}-${Date.now()}`;
      const def = componentLibrary.find((d) => d.type === parsed.type);
      addComponent({
        id: newId,
        type: parsed.type as CircuitComponent['type'],
        name: parsed.name || parsed.type,
        x: snapToGrid(canvas.x),
        y: snapToGrid(canvas.y),
        rotation: 0,
        pins: def?.defaultPins.map((p, i) => ({
          pinNumber: p.pinNumber,
          pinName: p.pinName,
          value: p.value,
          x: 0,
          y: 0,
          side: 'left',
        })) || [],
        props: def?.defaultProps ? { ...def.defaultProps } : undefined,
      });
      setSelectedComponent(newId);
    },
    [offset, zoom, addComponent, setSelectedComponent],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  /* ============ CURSOR ============ */
  const cursor = isPanning ? 'grabbing' : spaceDown ? 'grab' : activeWire ? 'crosshair' : draggingComponent ? 'grabbing' : 'default';

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className={`flex flex-col h-full bg-[#0a0a0f] ${className}`}>
      {/* ===== TOOLBAR ===== */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/95 border-b border-zinc-800 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          {/* Wire count */}
          <span className="text-[10px] text-zinc-400 font-mono">
            {wires.length} wire{wires.length !== 1 ? 's' : ''}
          </span>

          <div className="w-px h-4 bg-zinc-700" />

          {/* Clear wires */}
          {wires.length > 0 && (
            <button
              onClick={() => { clearWires(); setSelectedWire(null); }}
              className="px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              Clear
            </button>
          )}

          <div className="w-px h-4 bg-zinc-700" />

          {/* Zoom */}
          <button onClick={() => setZoom(Math.max(MIN_ZOOM, zoom / 1.2))} className="px-1.5 py-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded text-xs font-bold">
            −
          </button>
          <span className="text-[10px] text-zinc-400 font-mono w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => setZoom(Math.min(MAX_ZOOM, zoom * 1.2))} className="px-1.5 py-0.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded text-xs font-bold">
            +
          </button>

          <div className="w-px h-4 bg-zinc-700" />

          {/* Grid toggle */}
          <button
            onClick={toggleGrid}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${showGrid ? 'bg-emerald-600/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Grid
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
          {activeWire && (
            <span className="text-[10px] text-amber-400 animate-pulse">Wiring...</span>
          )}
          <span className="text-[10px] text-zinc-600">{components.length} comp</span>
        </div>
      </div>

      {/* ===== CANVAS ===== */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <svg width="100%" height="100%" className="select-none">
          <defs>
            <filter id="wire-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={3} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
            {/* Background */}
            <rect x={-3000} y={-3000} width={6000} height={6000} fill="#0a0a0f" />

            {/* Grid dots */}
            {showGrid && (
              <g>
                {Array.from({ length: 200 }, (_, gx) =>
                  Array.from({ length: 120 }, (_, gy) => (
                    <circle
                      key={`g-${gx}-${gy}`}
                      cx={-2000 + gx * GRID_SIZE}
                      cy={-1200 + gy * GRID_SIZE}
                      r={GRID_DOT_R}
                      fill="#1a1a2a"
                    />
                  )),
                )}
              </g>
            )}

            {/* ===== WIRES ===== */}
            {wires.map((wire) => (
              <WirePath
                key={wire.id}
                wire={wire}
                isSelected={wire.id === selectedWireId}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWire(wire.id);
                  setSelectedComponent(null);
                }}
              />
            ))}

            {/* ===== ACTIVE WIRE ===== */}
            {activeWire && (
              <g>
                <ActiveWirePath
                  fromX={activeWire.fromX}
                  fromY={activeWire.fromY}
                  toX={activeWire.toX}
                  toY={activeWire.toY}
                />
                {/* Snap indicator */}
                {snapTarget && (
                  <SnapRing cx={snapTarget.x} cy={snapTarget.y} />
                )}
              </g>
            )}

            {/* ===== BOARD ===== */}
            <g transform={`translate(${BOARD_X}, ${BOARD_Y})`}>
              <BoardSVGSelector
                boardId={boardType}
                pinStates={boardPinStatesMap}
                selectedPinId={hoveredPinId?.startsWith(`board-${boardType}:`) ? hoveredPinId.split(':')[1] : undefined}
                onPinClick={handleBoardPinClick}
                onPinHover={(pinId) => setHoveredPinId(pinId ? `board-${boardType}:${pinId}` : null)}
                onPinLeave={() => {
                  if (hoveredPinId?.startsWith(`board-${boardType}:`)) {
                    setHoveredPinId(null);
                  }
                }}
              />
            </g>

            {/* ===== PLACED COMPONENTS ===== */}
            {components.map((comp) => (
              <CanvasComponent
                key={comp.id}
                comp={comp}
                isSelected={comp.id === selectedComponentId}
                isDragging={draggingComponent?.id === comp.id}
                simPins={simulation.pinStates[comp.id]}
                hoveredPinId={hoveredPinId}
                connectedPins={connectedPinSet}
                onPinMouseDown={handleComponentPinMouseDown}
                onComponentMouseDown={handleComponentMouseDown}
              />
            ))}

            {/* Board pin hover tooltip overlay (canvas coords) */}
            {hoveredPinId?.startsWith('board-') && (
              <g className="pointer-events-none">
                {/* Find the pin position */}
                {(() => {
                  const pinPart = hoveredPinId.split(':');
                  const pinId = pinPart[1];
                  const boardPinout = getBoardPinout(boardType);
                  const pin = boardPinout?.pins.find((p) => p.id === pinId);
                  if (!pin) return null;
                  const cx = BOARD_X + pin.x * BOARD_U;
                  const cy = BOARD_Y + pin.y * BOARD_U;
                  return (
                    <circle cx={cx} cy={cy} r={10} fill="#10b981" opacity={0.15} />
                  );
                })()}
              </g>
            )}
          </g>
        </svg>

        {/* Watermark */}
        <div className="absolute bottom-3 right-3 text-[10px] text-zinc-800 font-medium pointer-events-none">
          Eesha Learn Simulator
        </div>
      </div>

      {/* ===== CONTEXT MENU ===== */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl shadow-black/40 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ContextMenuItem label="Duplicate" shortcut="Ctrl+D" onClick={contextDuplicate} />
          <div className="h-px bg-zinc-700 my-1" />
          <ContextMenuItem label="Delete" shortcut="Del" onClick={contextDelete} danger />
        </div>
      )}
    </div>
  );
}
