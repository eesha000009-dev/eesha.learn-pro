'use client';

import React, { useCallback } from 'react';
import type { Wire, WireDraft } from '@/types';
import { generateOrthogonalPath, generatePreviewPath, pointsToSvgPath } from '@/lib/wire-utils';

interface WireRendererProps {
  wires: Wire[];
  wireDraft: WireDraft | null;
  selectedWireId: string | null;
  onSelectWire: (id: string | null) => void;
  hoveredWireId: string | null;
  onHoverWire: (id: string | null) => void;
}

export function WireRenderer({ wires, wireDraft, selectedWireId, onSelectWire, hoveredWireId, onHoverWire }: WireRendererProps) {
  const renderWire = (wire: Wire) => {
    const isSelected = wire.id === selectedWireId;
    const isHovered = wire.id === hoveredWireId;

    // Generate orthogonal path from start through waypoints to end
    const points = generateOrthogonalPath(
      { x: wire.start.x, y: wire.start.y },
      wire.waypoints,
      { x: wire.end.x, y: wire.end.y }
    );
    const pathD = pointsToSvgPath(points);

    return (
      <g key={wire.id}>
        {/* Wire shadow */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none"
        />
        {/* Wire body */}
        <path
          d={pathD}
          fill="none"
          stroke={isSelected ? '#4361EE' : wire.color}
          strokeWidth={isHovered ? 3.5 : 2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="cursor-pointer transition-[stroke-width] duration-100"
          style={{ transitionProperty: 'stroke-width', transitionDuration: '100ms' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectWire(isSelected ? null : wire.id);
          }}
          onMouseEnter={() => onHoverWire(wire.id)}
          onMouseLeave={() => onHoverWire(null)}
        />
        {/* Selected wire: dashed overlay */}
        {isSelected && (
          <path
            d={pathD}
            fill="none"
            stroke="#4361EE"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 4"
            className="pointer-events-none"
          />
        )}
        {/* Connection endpoint dots */}
        <circle cx={wire.start.x} cy={wire.start.y} r="3.5" fill={isSelected ? '#4361EE' : wire.color} stroke="white" strokeWidth="1.5" className="pointer-events-none" />
        <circle cx={wire.end.x} cy={wire.end.y} r="3.5" fill={isSelected ? '#4361EE' : wire.color} stroke="white" strokeWidth="1.5" className="pointer-events-none" />
        {/* Waypoint dots */}
        {wire.waypoints.map((wp, i) => (
          <circle key={i} cx={wp.x} cy={wp.y} r="2.5" fill={wire.color} stroke="white" strokeWidth="1" className="pointer-events-none" />
        ))}
      </g>
    );
  };

  return (
    <g>
      {/* Rendered wires */}
      {wires.map(renderWire)}

      {/* Wire draft (being drawn) */}
      {wireDraft && (
        <g className="pointer-events-none">
          {/* Orthogonal preview path */}
          {(() => {
            const points = generatePreviewPath(
              { x: wireDraft.startX, y: wireDraft.startY },
              wireDraft.waypoints,
              wireDraft.currentX,
              wireDraft.currentY
            );
            const pathD = pointsToSvgPath(points);
            return (
              <>
                {/* Shadow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dashed preview */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={wireDraft.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 4"
                />
              </>
            );
          })()}
          {/* Start endpoint */}
          <circle cx={wireDraft.startX} cy={wireDraft.startY} r="4" fill={wireDraft.color} stroke="white" strokeWidth="1.5" />
          {/* Current mouse position */}
          <circle cx={wireDraft.currentX} cy={wireDraft.currentY} r="3" fill={wireDraft.color} opacity="0.6" />
          {/* Waypoint dots */}
          {wireDraft.waypoints.map((wp, i) => (
            <circle key={i} cx={wp.x} cy={wp.y} r="3" fill={wireDraft.color} stroke="white" strokeWidth="1" />
          ))}
        </g>
      )}
    </g>
  );
}
