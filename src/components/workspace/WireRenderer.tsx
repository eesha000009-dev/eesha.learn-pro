'use client';

import React, { useCallback } from 'react';
import type { Wire, WireDraft } from '@/types';

interface WireRendererProps {
  wires: Wire[];
  wireDraft: WireDraft | null;
  components: { id: string; x: number; y: number; pins: { id: string; offset: { x: number; y: number } }[] }[];
  selectedWireId: string | null;
  onSelectWire: (id: string | null) => void;
  wireColor: string;
}

export function WireRenderer({ wires, wireDraft, components, selectedWireId, onSelectWire, wireColor }: WireRendererProps) {
  const getPinPosition = useCallback(
    (componentId: string, pinId: string) => {
      const comp = components.find((c) => c.id === componentId);
      if (!comp) return null;
      const pin = comp.pins.find((p) => p.id === pinId);
      if (!pin) return null;
      return { x: comp.x + pin.offset.x, y: comp.y + pin.offset.y };
    },
    [components]
  );

  const renderWirePath = (x1: number, y1: number, x2: number, y2: number, color: string, id: string, isSelected: boolean) => {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const midX = (x1 + x2) / 2;

    // Manhattan-style routing
    let d: string;
    if (dx > dy) {
      d = `M ${x1} ${y1} L ${x1} ${y1 + 30} L ${midX} ${y1 + 30} L ${midX} ${y2 - 30} L ${x2} ${y2 - 30} L ${x2} ${y2}`;
    } else {
      d = `M ${x1} ${y1} L ${x1 + 30} ${y1} L ${x1 + 30} ${y2} L ${x2} ${y2}`;
    }

    return (
      <g key={id}>
        {/* Wire shadow */}
        <path
          d={d}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Wire */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`cursor-pointer ${isSelected ? 'stroke-emerald-400 stroke-[3]' : 'hover:stroke-[3.5]'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectWire(isSelected ? null : id);
          }}
        />
        {/* Connection dots */}
        <circle cx={x1} cy={y1} r="4" fill={color} />
        <circle cx={x2} cy={y2} r="4" fill={color} />
      </g>
    );
  };

  return (
    <g>
      {/* Rendered wires */}
      {wires.map((wire) => {
        const from = getPinPosition(wire.from.componentId, wire.from.pinId);
        const to = getPinPosition(wire.to.componentId, wire.to.pinId);
        if (!from || !to) return null;
        return renderWirePath(from.x, from.y, to.x, to.y, wire.color, wire.id, wire.id === selectedWireId);
      })}

      {/* Wire draft (being drawn) */}
      {wireDraft && (
        <g>
          <line
            x1={wireDraft.startX}
            y1={wireDraft.startY}
            x2={wireDraft.currentX}
            y2={wireDraft.currentY}
            stroke={wireColor}
            strokeWidth="2.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
            className="pointer-events-none"
          />
          <circle cx={wireDraft.startX} cy={wireDraft.startY} r="4" fill={wireColor} />
          <circle cx={wireDraft.currentX} cy={wireDraft.currentY} r="4" fill={wireColor} opacity="0.6" />
        </g>
      )}
    </g>
  );
}
