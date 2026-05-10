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
}
interface PanState {
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

export function CanvasWorkspace() {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<DragState | null>(null);
  const panningRef = useRef<PanState | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number | null>(null);
  const pinHandledRef = useRef(false);

  // State that triggers re-renders
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
  const shouldShowPinDots = showPinDots || selectedComponentId !== null || wireDraft !== null;
  const allPinPositions = shouldShowPinDots ? getAllPinPositions(components) : [];

  // ─── Convert client coordinates to SVG world coordinates ─────────────────
  function clientToWorld(clientX: number, clientY: number, currentZoom: number, currentPan: { x: number; y: number }) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - rect.width / 2) / currentZoom - currentPan.x,
      y: (clientY - rect.top - rect.height / 2) / currentZoom - currentPan.y,
    };
  }

  // ─── Pin proximity threshold (generous for touch devices) ───────────────
  function getPinThreshold(currentZoom: number) {
    return Math.max(20, 28 / currentZoom);
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

    // 2. Check if clicking on a component → start drag
    if (target) {
      const compData = target.closest('[data-component-id]');
      if (compData) {
        const compId = compData.getAttribute('data-component-id');
        if (compId) {
          store.setSelectedComponent(compId);
          const comp = currentComponents.find((c) => c.id === compId);
          if (comp && !currentWireDraft) {
            draggingRef.current = { componentId: compId, offsetX: world.x - comp.x, offsetY: world.y - comp.y };
          }
          return;
        }
      }
    }

    // 3. During wire creation, add waypoint on empty canvas
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

    // 4. Empty space → deselect & start panning
    store.setSelectedComponent(null);
    store.setSelectedWire(null);
    panningRef.current = {
      startX: clientX,
      startY: clientY,
      startPanX: currentPanOffset.x,
      startPanY: currentPanOffset.y,
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
      return;
    }

    // Dragging component
    if (draggingRef.current) {
      const d = draggingRef.current;
      const world = clientToWorld(clientX, clientY, currentZoom, currentPanOffset);
      store.moveComponent(d.componentId, world.x - d.offsetX, world.y - d.offsetY);
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
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartZoomRef.current = useSimulatorStore.getState().workspace.zoom;
      cancelWireDraft();
      draggingRef.current = null;
      panningRef.current = null;
      return;
    }

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleInteractionStart(
      touch.clientX,
      touch.clientY,
      document.elementFromPoint(touch.clientX, touch.clientY) as SVGElement | null
    );
  }

  function handleTouchMove(e: React.TouchEvent<SVGSVGElement>) {
    if (e.cancelable) e.preventDefault();

    // Pinch zoom
    if (e.touches.length === 2 && pinchStartDistRef.current !== null && pinchStartZoomRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / pinchStartDistRef.current;
      const newZoom = Math.max(0.25, Math.min(3, pinchStartZoomRef.current * scale));
      setZoom(newZoom);
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

  // ─── Compute cursor style (derived from wireDraft state only, not refs) ─
  const cursorStyle = wireDraft ? 'crosshair' : 'grab';

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
                  {/* Invisible overlay for drag - covers entire board */}
                  <rect
                    x={comp.x - 5}
                    y={comp.y - 5}
                    width={300}
                    height={223}
                    fill="transparent"
                    className="cursor-move"
                    style={{ touchAction: 'none' }}
                  />
                </g>
              );
            }
            const maxPinX = comp.pins.length > 0 ? Math.max(...comp.pins.map(p => p.offset.x)) : 70;
            const maxPinY = comp.pins.length > 0 ? Math.max(...comp.pins.map(p => p.offset.y)) : 50;
            return (
              <g key={comp.id} data-component-id={comp.id}>
                <ComponentRenderer
                  comp={comp}
                  selected={comp.id === selectedComponentId}
                  onPinClick={(pinId: string, absX: number, absY: number) => handlePinClick(comp.id, pinId, absX, absY)}
                />
                {/* Invisible overlay for drag */}
                <rect
                  x={comp.x - 10}
                  y={comp.y - 10}
                  width={maxPinX + 40}
                  height={maxPinY + 40}
                  fill="transparent"
                  className="cursor-move"
                  style={{ touchAction: 'none' }}
                />
              </g>
            );
          })}

          {/* Empty state */}
          {components.length === 0 && (
            <text x="0" y="-30" textAnchor="middle" fill="#d1d5db" fontSize="16" fontFamily="sans-serif">
              Add components from the + Components panel
            </text>
          )}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label="Zoom out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
        </button>
        <span className="text-[10px] text-gray-500 font-mono min-w-[2.5rem] text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          aria-label="Zoom in"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button
          onClick={() => setZoom(1)}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors text-[10px] font-mono"
          aria-label="Reset zoom"
        >
          1:1
        </button>
      </div>

      {/* Wire creation overlay hint */}
      {wireDraft && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#4361EE]/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg max-w-[90vw]">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse shrink-0" />
          <span className="truncate">
            {nearPin
              ? `Connect to ${nearPin.pinId}`
              : 'Tap/click a pin to connect · Tap canvas for waypoint'
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
    </div>
  );
}
