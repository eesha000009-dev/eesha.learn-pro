'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { ArduinoBoardSVG } from './ArduinoBoardSVG';
import { ComponentRenderer } from './ComponentRenderer';
import { WireRenderer } from './WireRenderer';
import { findClosestPin, getAllPinPositions } from '@/lib/pin-position';
import { pinTypeColor } from '@/lib/wire-utils';

// ─── Transient interaction state (refs to avoid re-renders) ────────────────
interface DragState {
  componentId: string;
  offsetX: number;
  offsetY: number;
  hasMoved: boolean;
}
interface PanState {
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
  hasMoved: boolean;
}

export function CanvasWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<DragState | null>(null);
  const panningRef = useRef<PanState | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number | null>(null);
  const pinchMidRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinHandledRef = useRef(false);

  // State that triggers re-renders
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [nearPin, setNearPin] = useState<{ componentId: string; pinId: string; x: number; y: number } | null>(null);
  const [showPinDots, setShowPinDots] = useState(false);

  const {
    workspace, setPanOffset, setZoom,
    components, moveComponent, removeComponent, addComponent,
    wires, wireDraft,
    startWireDraft, updateWireDraft, addWireWaypoint, cancelWireDraft, finishWireDraft,
    selectedComponentId, setSelectedComponent,
    selectedWireId, setSelectedWire,
    removeWire, updateWireColor,
  } = useSimulatorStore();

  const { panOffset, zoom, showGrid, gridSize } = workspace;
  const shouldShowPinDots = showPinDots || selectedComponentId !== null || wireDraft !== null;
  const allPinPositions = shouldShowPinDots ? getAllPinPositions(components) : [];

  // ─── Convert client coordinates to SVG world coordinates ─────────────────
  // SVG group transform: translate(panX*zoom, panY*zoom) scale(zoom)
  // World (wx,wy) → SVG coord: (panX*zoom + wx*zoom, panY*zoom + wy*zoom)
  // Inverse: wx = (svgX - panX*zoom) / zoom = svgX/zoom - panX
  function clientToWorld(clientX: number, clientY: number, currentZoom?: number, currentPan?: { x: number; y: number }) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const z = currentZoom ?? useSimulatorStore.getState().workspace.zoom;
    const p = currentPan ?? useSimulatorStore.getState().workspace.panOffset;
    const svgX = clientX - rect.left;
    const svgY = clientY - rect.top;
    return {
      x: svgX / z - p.x,
      y: svgY / z - p.y,
    };
  }

  // ─── Pin proximity threshold (generous for touch devices) ───────────────
  function getPinThreshold(currentZoom: number) {
    return Math.max(20, 30 / currentZoom);
  }

  // ─── Core interaction start (mouse & touch unified) ─────────────────────
  function handleInteractionStart(clientX: number, clientY: number, target: SVGElement | null) {
    const store = useSimulatorStore.getState();
    const currentComponents = store.components;
    const currentWireDraft = store.wireDraft;
    const currentPanOffset = store.workspace.panOffset;
    const currentZoom = store.workspace.zoom;
    const threshold = getPinThreshold(currentZoom);

    const world = clientToWorld(clientX, clientY, currentZoom, currentPanOffset);

    // 1. Check pin proximity FIRST (prevents drag/pan from stealing pin taps)
    const closestPin = findClosestPin(world.x, world.y, currentComponents, threshold);
    if (closestPin) {
      pinHandledRef.current = true;
      if (currentWireDraft) {
        store.finishWireDraft(closestPin.componentId, closestPin.pinId);
      } else {
        store.startWireDraft(closestPin.componentId, closestPin.pinId, closestPin.x, closestPin.y);
      }
      return;
    }

    pinHandledRef.current = false;

    // 2. Check if clicking on a wire → select it
    if (target) {
      const wireEl = target.closest('[data-wire-id]');
      if (wireEl) {
        const wireId = wireEl.getAttribute('data-wire-id');
        if (wireId) {
          store.setSelectedWire(store.selectedWireId === wireId ? null : wireId);
          store.setSelectedComponent(null);
          return;
        }
      }
    }

    // 3. Check if clicking on a component → start drag
    if (target) {
      const compData = target.closest('[data-component-id]');
      if (compData) {
        const compId = compData.getAttribute('data-component-id');
        if (compId) {
          store.setSelectedComponent(compId);
          store.setSelectedWire(null);
          const comp = currentComponents.find((c) => c.id === compId);
          if (comp && !currentWireDraft) {
            draggingRef.current = { componentId: compId, offsetX: world.x - comp.x, offsetY: world.y - comp.y, hasMoved: false };
          }
          return;
        }
      }
    }

    // 4. During wire creation, add waypoint on empty canvas
    if (currentWireDraft) {
      const closest = findClosestPin(world.x, world.y, currentComponents, threshold);
      if (closest) {
        pinHandledRef.current = true;
        store.finishWireDraft(closest.componentId, closest.pinId);
      } else {
        store.addWireWaypoint(world.x, world.y);
      }
      return;
    }

    // 5. Empty space → deselect & start panning
    store.setSelectedComponent(null);
    store.setSelectedWire(null);
    panningRef.current = {
      startX: clientX,
      startY: clientY,
      startPanX: currentPanOffset.x,
      startPanY: currentPanOffset.y,
      hasMoved: false,
    };
  }

  // ─── Core interaction move (mouse & touch unified) ─────────────────────
  function handleInteractionMove(clientX: number, clientY: number) {
    const store = useSimulatorStore.getState();
    const currentZoom = store.workspace.zoom;
    const currentWireDraft = store.wireDraft;
    const currentComponents = store.components;
    const currentPanOffset = store.workspace.panOffset;
    const threshold = getPinThreshold(currentZoom);

    // Panning
    if (panningRef.current) {
      const p = panningRef.current;
      const dx = (clientX - p.startX) / currentZoom;
      const dy = (clientY - p.startY) / currentZoom;
      store.setPanOffset({ x: p.startPanX + dx, y: p.startPanY + dy });
      if (Math.abs(clientX - p.startX) > 3 || Math.abs(clientY - p.startY) > 3) {
        p.hasMoved = true;
      }
      return;
    }

    // Dragging component
    if (draggingRef.current) {
      const d = draggingRef.current;
      const world = clientToWorld(clientX, clientY, currentZoom, currentPanOffset);
      store.moveComponent(d.componentId, world.x - d.offsetX, world.y - d.offsetY);
      // Update wire positions in real-time so wires follow the component
      store.updateWirePositions(d.componentId);
      d.hasMoved = true;
      return;
    }

    // Wire draft preview
    if (currentWireDraft) {
      const world = clientToWorld(clientX, clientY, currentZoom, currentPanOffset);
      store.updateWireDraft(world.x, world.y);
      const closest = findClosestPin(world.x, world.y, currentComponents, threshold);
      if (closest && closest.componentId !== currentWireDraft.fromComponentId) {
        setNearPin(closest);
      } else {
        setNearPin(null);
      }
    }
  }

  // ─── Core interaction end (mouse & touch unified) ───────────────────────
  function handleInteractionEnd() {
    if (draggingRef.current) {
      const store = useSimulatorStore.getState();
      store.updateWirePositions(draggingRef.current.componentId);
    }
    draggingRef.current = null;
    panningRef.current = null;
    pinchStartDistRef.current = null;
    pinchStartZoomRef.current = null;
    pinchMidRef.current = null;
  }

  // ─── Mouse event handlers ──────────────────────────────────────────────
  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    handleInteractionStart(e.clientX, e.clientY, e.target as SVGElement);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    handleInteractionMove(e.clientX, e.clientY);
  }

  function handleMouseUp() {
    handleInteractionEnd();
  }

  // ─── Touch event handlers ──────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent<SVGSVGElement>) {
    if (e.cancelable) e.preventDefault();

    // Two-finger pinch zoom start
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartZoomRef.current = useSimulatorStore.getState().workspace.zoom;
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const pan = useSimulatorStore.getState().workspace.panOffset;
      const worldMid = clientToWorld(midX, midY);
      pinchMidRef.current = { x: midX, y: midY, panX: worldMid.x, panY: worldMid.y };
      cancelWireDraft();
      draggingRef.current = null;
      panningRef.current = null;
      return;
    }

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    // Use document.elementFromPoint to find the actual element under touch
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    handleInteractionStart(
      touch.clientX,
      touch.clientY,
      el as SVGElement | null
    );
  }

  function handleTouchMove(e: React.TouchEvent<SVGSVGElement>) {
    if (e.cancelable) e.preventDefault();

    // Pinch zoom with pan centering
    if (e.touches.length === 2 && pinchStartDistRef.current !== null && pinchStartZoomRef.current !== null && pinchMidRef.current) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / pinchStartDistRef.current;
      const newZoom = Math.max(0.25, Math.min(3, pinchStartZoomRef.current * scale));

      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const pm = pinchMidRef.current;
      // Adjust pan so the midpoint stays stable
      const newPanX = pm.panX - (midX - pm.x) / newZoom;
      const newPanY = pm.panY - (midY - pm.y) / newZoom;

      const store = useSimulatorStore.getState();
      store.setZoom(newZoom);
      store.setPanOffset({ x: newPanX, y: newPanY });
      return;
    }

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleInteractionMove(touch.clientX, touch.clientY);
  }

  function handleTouchEnd(e: React.TouchEvent<SVGSVGElement>) {
    if (e.cancelable) e.preventDefault();
    if (e.touches.length === 0) {
      handleInteractionEnd();
    } else if (e.touches.length === 1) {
      pinchStartDistRef.current = null;
      pinchStartZoomRef.current = null;
      pinchMidRef.current = null;
    }
  }

  // ─── Wheel zoom ───────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(zoom + delta);
  }, [zoom, setZoom]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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

  // ─── Pin click handler (passed to component renderers as fallback) ─────
  function handlePinClick(componentId: string, pinId: string, absX: number, absY: number) {
    // Skip if already handled by handleInteractionStart (prevents double wire creation)
    if (pinHandledRef.current) {
      pinHandledRef.current = false;
      return;
    }
    if (wireDraft) {
      finishWireDraft(componentId, pinId);
    } else {
      startWireDraft(componentId, pinId, absX, absY);
    }
  }

  // ─── Drag-from-palette: handle drop ───────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const defId = e.dataTransfer.getData('application/component-type');
    if (!defId) return;
    const world = clientToWorld(e.clientX, e.clientY);
    addComponent(defId, world.x, world.y);
  }, [addComponent]);

  // ─── Compute cursor style ──────────────────────────────────────────────
  const cursorStyle = wireDraft ? 'crosshair' : 'grab';

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-white"
      onMouseEnter={() => setShowPinDots(true)}
      onMouseLeave={() => { setShowPinDots(false); setNearPin(null); }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
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
        className="w-full h-full"
        style={{
          cursor: cursorStyle,
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleInteractionEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={`translate(${panOffset.x * zoom}, ${panOffset.y * zoom}) scale(${zoom})`}>
          {/* Workspace origin indicator */}
          <line x1="-20" y1="0" x2="20" y2="0" stroke="#e5e7eb" strokeWidth="1" className="pointer-events-none" />
          <line x1="0" y1="-20" x2="0" y2="20" stroke="#e5e7eb" strokeWidth="1" className="pointer-events-none" />

          {/* Wires (render behind components) */}
          <WireRenderer
            wires={wires}
            wireDraft={wireDraft}
            selectedWireId={selectedWireId}
            onSelectWire={setSelectedWire}
            hoveredWireId={hoveredWireId}
            onHoverWire={setHoveredWireId}
          />

          {/* Pin dots layer (visual only, pointer-events-none) */}
          {shouldShowPinDots && allPinPositions.map((pin) => {
            const isNearTarget = nearPin && nearPin.componentId === pin.componentId && nearPin.pinId === pin.pinId;
            const r = isNearTarget ? 7 : 5;
            const color = pinTypeColor(pin.type);
            return (
              <circle
                key={`dot-${pin.componentId}-${pin.pinId}`}
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
              r={14}
              fill="none"
              stroke="#4361EE"
              strokeWidth="2.5"
              opacity="0.5"
              className="pointer-events-none"
            >
              <animate attributeName="r" values="12;16;12" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1s" repeatCount="indefinite" />
            </circle>
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
                    onPinClick={(pinId: string, absX: number, absY: number) => handlePinClick(comp.id, pinId, absX, absY)}
                  />
                </g>
              );
            }
            return (
              <g key={comp.id} data-component-id={comp.id}>
                <ComponentRenderer
                  comp={comp}
                  selected={comp.id === selectedComponentId}
                  onPinClick={(pinId: string, absX: number, absY: number) => handlePinClick(comp.id, pinId, absX, absY)}
                />
              </g>
            );
          })}

          {/* Empty state */}
          {components.length === 0 && (
            <text x="0" y="-30" textAnchor="middle" fill="#d1d5db" fontSize="16" fontFamily="sans-serif" className="pointer-events-none">
              Add components from the + Components panel
            </text>
          )}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center gap-0.5 sm:gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-1.5 sm:px-2 py-1 shadow-sm">
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label="Zoom out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
        </button>
        <span className="text-[10px] sm:text-[11px] text-gray-500 font-mono min-w-[2.5rem] text-center tabular-nums select-none">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label="Zoom in"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors text-[10px] font-mono"
          aria-label="Reset zoom"
        >
          1:1
        </button>
      </div>

      {/* Wire creation overlay hint */}
      {wireDraft && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#4361EE]/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg max-w-[90vw] z-10">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse shrink-0" />
          <span className="truncate">
            {nearPin
              ? `Connect to ${nearPin.pinId}`
              : 'Tap a pin to connect · Tap canvas for waypoint'
            }
          </span>
          <button
            onClick={cancelWireDraft}
            className="ml-1 text-white/70 hover:text-white text-[10px] font-medium whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Selected component info (mobile) */}
      {selectedComponentId && !wireDraft && (
        <div className="absolute bottom-14 right-3 sm:bottom-16 sm:right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-2 py-1.5 shadow-sm text-[10px] text-gray-500 max-w-[160px] z-10 sm:hidden">
          {(() => {
            const comp = components.find(c => c.id === selectedComponentId);
            if (!comp) return null;
            const def = comp.defId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-700 truncate">{def}</span>
                <span className="text-gray-300">|</span>
                <span className="text-red-400" onClick={() => { removeComponent(selectedComponentId); setSelectedComponent(null); }}>Delete</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Wire editing toolbar — shown when a wire is selected */}
      {selectedWireId && !wireDraft && (() => {
        const wire = wires.find(w => w.id === selectedWireId);
        if (!wire) return null;
        return (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg flex items-center gap-3 z-10">
            {/* Color swatches */}
            <div className="flex items-center gap-1.5">
              {['#ef4444', '#1a1a1a', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'].map((c) => (
                <button
                  key={c}
                  onClick={() => updateWireColor(selectedWireId, c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: wire.color === c ? '#4361EE' : '#e5e7eb',
                  }}
                  aria-label={`Set wire color to ${c}`}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200" />

            {/* Delete button */}
            <button
              onClick={() => { removeWire(selectedWireId); setSelectedWire(null); }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete
            </button>
          </div>
        );
      })()}
    </div>
  );
}
