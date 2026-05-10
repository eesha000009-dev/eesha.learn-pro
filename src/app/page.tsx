'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { CanvasWorkspace } from '@/components/workspace/CanvasWorkspace';
import { CodeEditorPanel } from '@/components/CodeEditorPanel';
import { SerialMonitor } from '@/components/SerialMonitor';
import { ComponentPalette } from '@/components/ComponentPalette';
import { WIRE_COLORS } from '@/lib/component-defs';
import type { ActiveTab } from '@/types';

const DEFAULT_SKETCH = `// Eesha Learn — Arduino Sketch
// LED Blink on Pin 13

void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("Eesha Learn - LED Blink");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(1000);
}
`;

export default function HomePage() {
  const {
    activeTab, setActiveTab,
    showPalette, togglePalette,
    showSerialMonitor, toggleSerialMonitor,
    simulation, setRunning, setPaused, resetSimulation,
    addComponent, addEditorTab, setActiveEditorTab,
    elapsedTime,
    speed,
    wireColor, setWireColor,
    components, editorTabs,
  } = useSimulatorStore();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize default project on first load
  useEffect(() => {
    if (editorTabs.length === 0) {
      addEditorTab({
        id: 'sketch-1',
        name: 'sketch.ino',
        language: 'arduino',
        content: DEFAULT_SKETCH,
        modified: false,
      });
      setActiveEditorTab('sketch-1');
      // Add default Arduino board
      addComponent('arduino-uno', 200, 150);
    }
  }, []);

  // Simple simulation tick for LED blink
  const tickCount = useRef(0);
  const simulateTick = useCallback(() => {
    tickCount.current++;
    const store = useSimulatorStore.getState();
    const code = store.editorTabs.find(t => t.language === 'arduino')?.content || '';
    const arduinoComp = store.components.find(c => c.defId === 'arduino-uno');

    if (arduinoComp && code.includes('digitalWrite(13')) {
      const period = 20; // ticks
      const isHigh = Math.floor(tickCount.current / period) % 2 === 0;
      store.updateComponentState(arduinoComp.id, { ledOn: isHigh });
      store.setComponentPinValue(arduinoComp.id, 'd13', isHigh ? 5 : 0);
    }

    // Simulate serial output
    if (code.includes('Serial.println') && code.includes('LED ON') && tickCount.current % 20 === 0) {
      const isHigh = Math.floor(tickCount.current / 20) % 2 === 0;
      store.addSerialOutput(isHigh ? 'LED ON' : 'LED OFF');
    }
  }, []);

  // Simulation tick
  useEffect(() => {
    if (simulation.isRunning && !simulation.isPaused) {
      timerRef.current = setInterval(() => {
        useSimulatorStore.getState().tickElapsedTime();
        simulateTick();
      }, 50);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [simulation.isRunning, simulation.isPaused, simulateTick]);

  const handleStartStop = () => {
    if (simulation.isRunning) {
      setRunning(false);
      setPaused(false);
      tickCount.current = 0;
    } else {
      resetSimulation();
      tickCount.current = 0;
      setRunning(true);
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'design',
      label: 'Design',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      id: 'code',
      label: 'Code',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      id: 'simulate',
      label: 'Simulate',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* ===== HEADER ===== */}
      <header className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 select-none shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                <span className="text-emerald-400">Eesha</span>
                <span className="text-zinc-300"> Learn</span>
              </h1>
              <p className="text-[8px] text-zinc-600 -mt-0.5 font-medium tracking-wider uppercase">Simulator</p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-zinc-800 mx-2" />

          {/* Tabs */}
          <div className="flex items-center bg-zinc-800/50 rounded-lg p-0.5 gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'simulate' && simulation.isRunning && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Wire color selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">Wire:</span>
          <div className="flex items-center gap-0.5">
            {WIRE_COLORS.slice(0, 6).map((wc) => (
              <button
                key={wc.color}
                onClick={() => setWireColor(wc.color)}
                className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                  wireColor === wc.color ? 'border-white scale-110' : 'border-zinc-700'
                }`}
                style={{ backgroundColor: wc.color }}
                title={wc.name}
              />
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Simulation controls */}
          <button
            onClick={handleStartStop}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              simulation.isRunning
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
            }`}
          >
            {simulation.isRunning ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                Stop
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Start
              </>
            )}
          </button>

          {simulation.isRunning && (
            <button
              onClick={() => setPaused(!simulation.isPaused)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              {simulation.isPaused ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              )}
            </button>
          )}

          {/* Speed */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/50 text-[10px] text-zinc-400">
            <span>{Math.round((speed ?? 1) * 100)}%</span>
          </div>

          {/* Elapsed time */}
          {simulation.isRunning && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/50 text-[10px] font-mono text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {(elapsedTime ?? 0).toFixed(3)}s
            </div>
          )}

          <div className="w-px h-5 bg-zinc-800 mx-1" />

          {/* Toggle palette */}
          <button
            onClick={togglePalette}
            className={`p-1.5 rounded-lg text-xs transition-all ${showPalette ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            title="Toggle Component Panel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="18" rx="1" /><line x1="16" y1="8" x2="22" y2="8" /><line x1="16" y1="12" x2="22" y2="12" /><line x1="16" y1="16" x2="22" y2="16" />
            </svg>
          </button>

          {/* Toggle serial */}
          <button
            onClick={toggleSerialMonitor}
            className={`p-1.5 rounded-lg text-xs transition-all ${showSerialMonitor ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
            title="Toggle Serial Monitor"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Component Palette */}
        {showPalette && (activeTab === 'design' || activeTab === 'simulate') && <ComponentPalette />}

        {/* Center: Tab content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'design' && (
            <CanvasWorkspace />
          )}

          {activeTab === 'code' && (
            <CodeEditorPanel />
          )}

          {activeTab === 'simulate' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Simulation canvas - same as design but with live state */}
              <div className="flex-1 overflow-hidden">
                <CanvasWorkspace />
              </div>
              {/* Serial Monitor */}
              {showSerialMonitor && (
                <div className="h-48 shrink-0">
                  <SerialMonitor />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-t border-zinc-800 select-none shrink-0">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="font-semibold text-zinc-400">Eesha Learn</span>
          <span className="text-zinc-700">v2.0</span>
          <span className="text-zinc-800">|</span>
          <span className="text-zinc-600 font-mono">avr8js</span>
          <span className="text-zinc-800">·</span>
          <span className="text-zinc-600 font-mono">Arduino</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-zinc-600">
            {components.length} component{components.length !== 1 ? 's' : ''}
          </span>
          <span className="text-zinc-800">|</span>
          {simulation.isRunning ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Running
            </span>
          ) : (
            <span className="text-zinc-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
              Idle
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
