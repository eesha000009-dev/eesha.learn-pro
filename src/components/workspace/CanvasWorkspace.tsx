'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { ArduinoBoardSVG } from './ArduinoBoardSVG';
import { ComponentRenderer } from './ComponentRenderer';
import { WireRenderer } from './WireRenderer';

export function CanvasWorkspace() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ componentId: string; offsetX: number; offsetY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  const {
    workspace, setPanOffset, setZoom,
    components, moveComponent, removeComponent,
    wires, wireDraft, wireColor,
    startWireDraft, updateWireDraft, cancelWireDraft, finishWireDraft,
    selectedComponentId, setSelectedComponent,
    selectedWireId, setSelectedWire,
    setComponentPinValue,
  } = useSimulatorStore();

  const { panOffset, zoom, showGrid, gridSize } = workspace;

  // ─── Mouse event handlers ──────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left - rect.width / 2) / zoom - panOffset.x;
    const svgY = (e.clientY - rect.top - rect.height / 2) / zoom - panOffset.y;

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
        if (comp) {
          setDragging({ componentId: compId, offsetX: svgX - comp.x, offsetY: svgY - comp.y });
        }
        return;
      }
    }

    // Click on empty space - start panning
    setSelectedComponent(null);
    setSelectedWire(null);
    if (wireDraft) {
      cancelWireDraft();
    }
    setPanning({
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    });
  }, [components, panOffset, zoom, wireDraft, setSelectedComponent, setSelectedWire, cancelWireDraft, startWireDraft, finishWireDraft]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    if (panning) {
      const dx = (e.clientX - panning.startX) / zoom;
      const dy = (e.clientY - panning.startY) / zoom;
      setPanOffset({ x: panning.startPanX + dx, y: panning.startPanY + dy });
      return;
    }

    if (dragging) {
      const svgX = (e.clientX - rect.left - rect.width / 2) / zoom - panOffset.x;
      const svgY = (e.clientY - rect.top - rect.height / 2) / zoom - panOffset.y;
      moveComponent(dragging.componentId, svgX - dragging.offsetX, svgY - dragging.offsetY);
      return;
    }

    if (wireDraft) {
      const svgX = (e.clientX - rect.left - rect.width / 2) / zoom - panOffset.x;
      const svgY = (e.clientY - rect.top - rect.height / 2) / zoom - panOffset.y;
      updateWireDraft(svgX, svgY);
    }
  }, [panning, dragging, wireDraft, panOffset, zoom, moveComponent, setPanOffset, updateWireDraft]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(null);
  }, []);

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

  // ─── Right-click context menu ────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as SVGElement;
    const compData = target.closest('[data-component-id]');
    if (compData) {
      const compId = compData.getAttribute('data-component-id');
      if (compId) {
        setSelectedComponent(compId);
      }
    }
  }, [setSelectedComponent]);

  return (
    <div className="flex-1 relative overflow-hidden bg-[#1a1a2e]">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: showGrid
            ? `radial-gradient(circle, #ffffff15 1px, transparent 1px)`
            : 'none',
          backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
          backgroundPosition: `${panOffset.x * zoom}px ${panOffset.y * zoom}px`,
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
        onContextMenu={handleContextMenu}
      >
        <g transform={`translate(${panOffset.x * zoom}, ${panOffset.y * zoom}) scale(${zoom})`}>
          {/* Workspace origin indicator */}
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#ffffff10" strokeWidth="1" />
          <line x1="0" y1="-20" x2="0" y2="20" stroke="#ffffff10" strokeWidth="1" />

          {/* Wires (render behind components) */}
          <WireRenderer
            wires={wires}
            wireDraft={wireDraft}
            components={components.map((c) => ({ id: c.id, x: c.x, y: c.y, pins: c.pins }))}
            selectedWireId={selectedWireId}
            onSelectWire={setSelectedWire}
            wireColor={wireColor}
          />

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
                    height={310}
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
            <text x="0" y="-30" textAnchor="middle" fill="#ffffff20" fontSize="16" fontFamily="sans-serif">
              Add components from the panel on the left
            </text>
          )}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg px-2 py-1">
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
        </button>
        <span className="text-[10px] text-zinc-500 font-mono min-w-[2.5rem] text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          onClick={() => setZoom(1)}
          className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors text-[10px] font-mono"
        >
          1:1
        </button>
      </div>

      {/* Info overlay */}
      {wireDraft && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-600/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          Click a pin to complete the wire connection
          <button
            onClick={cancelWireDraft}
            className="ml-1 text-white/70 hover:text-white text-[10px]"
          >
            ESC to cancel
          </button>
        </div>
      )}
    </div>
  );
}
