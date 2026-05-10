'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { ArduinoBoardSVG } from './ArduinoBoardSVG';
import { ComponentRenderer } from './ComponentRenderer';
import { WireRenderer } from './WireRenderer';
import { findClosestPin, getAllPinPositions } from '@/lib/pin-position';
import { pinTypeColor } from '@/lib/wire-utils';

export function CanvasWorkspace() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ componentId: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [nearPin, setNearPin] = useState<{ componentId: string; pinId: string; x: number; y: number } | null>(null);
  const [showPinDots, setShowPinDots] = useState(false);

  const {
    workspace, setPanOffset, setZoom,
    components, moveComponent, removeComponent,
    wires, wireDraft,
    startWireDraft, updateWireDraft, addWireWaypoint, cancelWireDraft, finishWireDraft,
    selectedComponentId, setSelectedComponent,
    selectedWireId, setSelectedWire,
  } = useSimulatorStore();

  const { panOffset, zoom, showGrid, gridSize } = workspace;

  // Show pin dots when component is selected, hovered, or wire creation mode
  const shouldShowPinDots = showPinDots || selectedComponentId !== null || wireDraft !== null;

  // ─── Convert client coordinates to SVG world coordinates ─────────────────
  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - rect.width / 2) / zoom - panOffset.x,
      y: (clientY - rect.top - rect.height / 2) / zoom - panOffset.y,
    };
  }, [zoom, panOffset]);

  // ─── Mouse event handlers ──────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;

    // Check if clicking on a pin (data attribute)
    const pinData = target.closest('[data-pin-id]');
    if (pinData) {
      const pinId = pinData.getAttribute('data-pin-id');
      const compId = pinData.getAttribute('data-comp-id');
      const pinX = parseFloat(pinData.getAttribute('data-pin-x') || '0');
      const pinY = parseFloat(pinData.getAttribute('data-pin-y') || '0');

      if (pinId && compId) {
        if (wireDraft) {
          // Finish wire connection
          finishWireDraft(compId, pinId);
        } else {
          // Start new wire
          startWireDraft(compId, pinId, pinX, pinY);
        }
        return;
      }
    }

    // Check if clicking on a component
    const compData = target.closest('[data-component-id]');
    if (compData) {
      const compId = compData.getAttribute('data-component-id');
      if (compId) {
        setSelectedComponent(compId);
        const comp = components.find((c) => c.id === compId);
        if (comp && !wireDraft) {
          const world = clientToWorld(e.clientX, e.clientY);
          setDragging({ componentId: compId, offsetX: world.x - comp.x, offsetY: world.y - comp.y });
        }
        return;
      }
    }

    // Click on empty space
    if (wireDraft) {
      // Add waypoint during wire creation
      const world = clientToWorld(e.clientX, e.clientY);
      // Check if near a pin
      const closest = findClosestPin(world.x, world.y, components, 20);
      if (closest) {
        finishWireDraft(closest.componentId, closest.pinId);
      } else {
        addWireWaypoint(world.x, world.y);
      }
      return;
    }

    // Deselect and start panning
    setSelectedComponent(null);
    setSelectedWire(null);
    setPanning({
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    });
  }, [components, panOffset, zoom, wireDraft, setSelectedComponent, setSelectedWire, cancelWireDraft, startWireDraft, finishWireDraft, addWireWaypoint, clientToWorld]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (panning) {
      const dx = (e.clientX - panning.startX) / zoom;
      const dy = (e.clientY - panning.startY) / zoom;
      setPanOffset({ x: panning.startPanX + dx, y: panning.startPanY + dy });
      return;
    }

    if (dragging) {
      const world = clientToWorld(e.clientX, e.clientY);
      moveComponent(dragging.componentId, world.x - dragging.offsetX, world.y - dragging.offsetY);
      return;
    }

    if (wireDraft) {
      const world = clientToWorld(e.clientX, e.clientY);
      updateWireDraft(world.x, world.y);
      // Check for nearby pin to highlight
      const closest = findClosestPin(world.x, world.y, components, 20);
      if (closest && closest.componentId !== wireDraft.fromComponentId) {
        setNearPin(closest);
      } else {
        setNearPin(null);
      }
    }
  }, [panning, dragging, wireDraft, components, zoom, moveComponent, setPanOffset, updateWireDraft, clientToWorld]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      // Update wire positions after drag
      const store = useSimulatorStore.getState();
      store.updateWirePositions(dragging.componentId);
    }
    setDragging(null);
    setPanning(null);
  }, [dragging]);

  // ─── Wheel zoom ───────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(zoom + delta);
  }, [zoom, setZoom]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId && !wireDraft) {
          removeComponent(selectedComponentId);
        } else if (selectedWireId) {
          useSimulatorStore.getState().removeWire(selectedWireId);
        }
      }
      if (e.key === 'Escape') {
        cancelWireDraft();
        setSelectedComponent(null);
        setSelectedWire(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, selectedWireId, wireDraft, removeComponent, cancelWireDraft, setSelectedComponent, setSelectedWire]);

  // ─── Pin click handler ───────────────────────────────────────────────

  const handlePinClick = useCallback((componentId: string, pinId: string, absX: number, absY: number) => {
    if (wireDraft) {
      finishWireDraft(componentId, pinId);
    } else {
      startWireDraft(componentId, pinId, absX, absY);
    }
  }, [wireDraft, startWireDraft, finishWireDraft]);

  // ─── Get all pin positions for rendering pin dots ────────────────────

  const allPinPositions = shouldShowPinDots ? getAllPinPositions(components) : [];

  return (
    <div
      className="flex-1 relative overflow-hidden bg-white"
      onMouseEnter={() => setShowPinDots(true)}
      onMouseLeave={() => { setShowPinDots(false); setNearPin(null); }}
    >
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: showGrid
            ? 'radial-gradient(circle, #d1d5db 0.8px, transparent 0.8px)'
            : 'none',
          backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
          backgroundPosition: `${panOffset.x * zoom}px ${panOffset.y * zoom}px`,
          opacity: 0.5,
        }}
      />

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={`translate(${panOffset.x * zoom}, ${panOffset.y * zoom}) scale(${zoom})`}>
          {/* Workspace origin indicator */}
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#e5e7eb" strokeWidth="1" />
          <line x1="0" y1="-20" x2="0" y2="20" stroke="#e5e7eb" strokeWidth="1" />

          {/* Wires (render behind components) */}
          <WireRenderer
            wires={wires}
            wireDraft={wireDraft}
            selectedWireId={selectedWireId}
            onSelectWire={setSelectedWire}
            hoveredWireId={hoveredWireId}
            onHoverWire={setHoveredWireId}
          />

          {/* Pin dots layer (rendered behind components but above wires) */}
          {shouldShowPinDots && allPinPositions.map((pin) => {
            const isNearTarget = nearPin && nearPin.componentId === pin.componentId && nearPin.pinId === pin.pinId;
            const r = isNearTarget ? 7 : 5;
            const color = pinTypeColor(pin.type);
            return (
              <circle
                key={`${pin.componentId}-${pin.pinId}`}
                cx={pin.x}
                cy={pin.y}
                r={r}
                fill={color}
                stroke="white"
                strokeWidth={isNearTarget ? 2.5 : 1.5}
                className="pointer-events-none"
                opacity={isNearTarget ? 1 : 0.7}
              />
            );
          })}

          {/* Near-pin highlight glow during wire creation */}
          {wireDraft && nearPin && (
            <circle
              cx={nearPin.x}
              cy={nearPin.y}
              r={12}
              fill="none"
              stroke="#4361EE"
              strokeWidth="2"
              opacity="0.5"
              className="pointer-events-none"
            />
          )}

          {/* Components */}
          {components.map((comp) => {
            if (comp.defId === 'arduino-uno') {
              return (
                <g key={comp.id} data-component-id={comp.id}>
                  <ArduinoBoardSVG
                    x={comp.x}
                    y={comp.y}
                    ledOn={comp.state?.ledOn ?? false}
                    powerLed={comp.state?.powerLed ?? true}
                    selected={comp.id === selectedComponentId}
                    onPinClick={(pinId, absX, absY) => handlePinClick(comp.id, pinId, absX, absY)}
                  />
                  {/* Invisible overlay for drag */}
                  <rect
                    x={comp.x - 5}
                    y={comp.y - 5}
                    width={290}
                    height={223}
                    fill="transparent"
                    className="cursor-move"
                  />
                </g>
              );
            }
            return (
              <g key={comp.id} data-component-id={comp.id}>
                <ComponentRenderer
                  comp={comp}
                  selected={comp.id === selectedComponentId}
                  onPinClick={(pinId, absX, absY) => handlePinClick(comp.id, pinId, absX, absY)}
                />
                {/* Invisible overlay for drag */}
                <rect
                  x={comp.x - 5}
                  y={comp.y - 5}
                  width={comp.pins.length > 0 ? Math.max(...comp.pins.map(p => p.offset.x)) + 30 : 70}
                  height={comp.pins.length > 0 ? Math.max(...comp.pins.map(p => p.offset.y)) + 30 : 50}
                  fill="transparent"
                  className="cursor-move"
                />
              </g>
            );
          })}

          {/* Empty state */}
          {components.length === 0 && (
            <text x="0" y="-30" textAnchor="middle" fill="#d1d5db" fontSize="16" fontFamily="sans-serif">
              Add components from the + Component AI panel
            </text>
          )}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
        </button>
        <span className="text-[10px] text-gray-500 font-mono min-w-[2.5rem] text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          onClick={() => setZoom(1)}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors text-[10px] font-mono"
        >
          1:1
        </button>
      </div>

      {/* Wire creation overlay hint */}
      {wireDraft && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#4361EE]/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          Click a pin to complete the wire · Click canvas to add waypoint
          <button
            onClick={cancelWireDraft}
            className="ml-1 text-white/70 hover:text-white text-[10px] font-medium"
          >
            ESC to cancel
          </button>
        </div>
      )}
    </div>
  );
}
