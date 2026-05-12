'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { CanvasWorkspace } from '@/components/workspace/CanvasWorkspace';
import { CodeEditorPanel } from '@/components/CodeEditorPanel';
import { SerialMonitor } from '@/components/SerialMonitor';
import { ComponentPalette } from '@/components/ComponentPalette';
import type { ActiveTab } from '@/types';
import type { MCUSimulator, PinStateChange } from '@/lib/simulator/avr-simulator';
import { createSimulator } from '@/lib/simulator/avr-simulator';
import { propagatePinChange } from '@/lib/simulator/pin-propagator';

// ─── Toast Notification ─────────────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string) {
  let el = document.getElementById('toast-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-msg';
    el.style.cssText =
      'position:fixed;bottom:56px;left:50%;transform:translateX(-50%) translateY(8px);background:#495057;color:#f8f9fa;padding:6px 16px;border-radius:8px;font-size:12px;z-index:999;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;border:1px solid #dee2e6;white-space:nowrap;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el!.style.opacity = '0';
    el!.style.transform = 'translateX(-50%) translateY(8px)';
  }, 1800);
}

// ─── Default Arduino Sketch ─────────────────────────────────────────────────
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

// ─── Tab definitions ────────────────────────────────────────────────────────
const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'design',
    label: 'Design',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'code',
    label: 'Code',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'simulate',
    label: 'Simulate',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
];

// ─── Simulation constants ──────────────────────────────────────────────────
const CYCLES_PER_TICK = 500000; // CPU cycles per simulation tick (~4MHz effective)
const TICK_INTERVAL_MS = 50;    // Run simulation tick every 50ms

// ─── Main Page Component ────────────────────────────────────────────────────
export default function HomePage() {
  const {
    activeTab,
    setActiveTab,
    showPalette,
    togglePalette,
    showSerialMonitor,
    toggleSerialMonitor,
    simulation,
    setRunning,
    setPaused,
    resetSimulation,
    addComponent,
    addEditorTab,
    setActiveEditorTab,
    components,
    wires,
    editorTabs,
    exportDiagram,
    importDiagram,
    saveToLocalStorage,
    loadFromLocalStorage,
    workspace,
    setZoom,
    setComponentPinValue,
    updateComponentState,
    addSerialOutput,
    addError,
    clearErrors,
  } = useSimulatorStore();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'loaded' | 'error'>('idle');
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);
  const simulatorRef = useRef<MCUSimulator | null>(null);
  const boardIdRef = useRef<string | null>(null);

  // ─── Initialize project ─────────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const loaded = loadFromLocalStorage();
    if (!loaded && editorTabs.length === 0) {
      addEditorTab({
        id: 'sketch-1',
        name: 'sketch.ino',
        language: 'arduino',
        content: DEFAULT_SKETCH,
        modified: false,
      });
      setActiveEditorTab('sketch-1');
      addComponent('arduino-uno', 200, 150);
    }
  }, []);

  // ─── Pin change handler (called by avr8js when GPIO changes) ──────────
  const handlePinChange = useCallback((changes: PinStateChange[]) => {
    const store = useSimulatorStore.getState();
    const boardId = boardIdRef.current;
    if (!boardId) return;

    for (const change of changes) {
      // Update the MCU component's pin value in the store
      store.setComponentPinValue(boardId, change.pinId, change.value);

      // Update Arduino built-in LED state (pin 13)
      if (change.pinId === 'd13') {
        store.updateComponentState(boardId, { ledOn: change.value > 2.5 });
      }

      // Propagate through wires to connected components
      propagatePinChange(
        boardId,
        change.pinId,
        change.value,
        store.wires,
        store.components,
        {
          setComponentPinValue: store.setComponentPinValue,
          updateComponentState: store.updateComponentState,
        },
      );
    }
  }, []);

  // ─── Serial output handler (called by avr8js when UART transmits) ────
  const handleSerialOutput = useCallback((line: string) => {
    const store = useSimulatorStore.getState();
    // Remove trailing \r\n and add to serial output
    const clean = line.replace(/\r?\n$/, '');
    if (clean) {
      store.addSerialOutput(clean);
    }
  }, []);

  // ─── Compile code and load into simulator ──────────────────────────────
  const compileAndLoad = useCallback(async () => {
    const store = useSimulatorStore.getState();
    const code = store.editorTabs.find((t) => t.language === 'arduino')?.content;
    const boardComp = store.components.find((c) => c.defId === 'arduino-uno');

    if (!code) {
      store.addError('No code to compile');
      setCompileStatus('error');
      return false;
    }

    if (!boardComp) {
      store.addError('No Arduino board on the canvas. Add an Arduino UNO to the workspace.');
      setCompileStatus('error');
      return false;
    }

    boardIdRef.current = boardComp.id;
    setCompileStatus('compiling');
    store.clearErrors();

    try {
      const res = await fetch('/api/compile?XTransformPort=3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, boardType: 'arduino-uno' }),
      });

      const data = await res.json();

      if (data.success && data.hex) {
        // Create simulator and load hex
        const simulator = createSimulator('arduino-uno');
        simulator.load(data.hex);

        // Hook up pin change listener
        simulator.onPinChange(handlePinChange);

        // Hook up serial output listener
        simulator.onSerialTransmit(handleSerialOutput);

        simulatorRef.current = simulator;
        setCompileStatus('loaded');
        return true;
      } else {
        // Compilation failed
        const errors = data.errors || [];
        if (errors.length > 0) {
          for (const err of errors) {
            store.addError(`Line ${err.line}: ${err.message}`);
          }
          showToast(`Compilation failed: ${errors[0].message}`);
        } else {
          store.addError('Compilation failed with unknown error');
          showToast('Compilation failed');
        }
        setCompileStatus('error');
        return false;
      }
    } catch (err: any) {
      store.addError(`Compilation error: ${err.message || 'Network error'}`);
      showToast('Failed to connect to compiler');
      setCompileStatus('error');
      return false;
    }
  }, [handlePinChange, handleSerialOutput]);

  // ─── Real simulation tick using avr8js ────────────────────────────────
  const simulateTick = useCallback(() => {
    const sim = simulatorRef.current;
    if (!sim) return;

    // Run CPU cycles
    sim.step(CYCLES_PER_TICK);
  }, []);

  // ─── Simulation interval ───────────────────────────────────────────────
  useEffect(() => {
    if (simulation.isRunning && !simulation.isPaused && compileStatus === 'loaded') {
      timerRef.current = setInterval(() => {
        useSimulatorStore.getState().tickElapsedTime();
        simulateTick();
      }, TICK_INTERVAL_MS);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [simulation.isRunning, simulation.isPaused, compileStatus, simulateTick]);

  // ─── Close export dropdown on outside click ────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // ─── Cleanup simulator on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      simulatorRef.current?.destroy();
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleStartStop = async () => {
    if (simulation.isRunning) {
      // Stop simulation
      setRunning(false);
      setPaused(false);
      simulatorRef.current?.stop();
      simulatorRef.current?.destroy();
      simulatorRef.current = null;
      setCompileStatus('idle');
    } else {
      // Start: compile first, then simulate
      resetSimulation();
      clearErrors();

      const success = await compileAndLoad();
      if (success) {
        setRunning(true);
        // Switch to simulate tab to see results
        setActiveTab('simulate');
      }
    }
  };

  const handleReset = () => {
    setRunning(false);
    setPaused(false);
    simulatorRef.current?.stop();
    simulatorRef.current?.destroy();
    simulatorRef.current = null;
    setCompileStatus('idle');
    resetSimulation();
  };

  const handleExportJSON = () => {
    const json = exportDiagram();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported diagram.json');
    setShowExportMenu(false);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      importDiagram(text);
      showToast('Imported diagram.json');
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowExportMenu(false);
  };

  const handleSave = () => {
    saveToLocalStorage();
    showToast('Project saved');
  };

  const handleLoad = () => {
    const ok = loadFromLocalStorage();
    showToast(ok ? 'Project loaded' : 'No saved project found');
  };

  const { zoom } = workspace;

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════
          ROW 1 — MAIN HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-1.5 sm:px-3 h-10 sm:h-11 md:h-12 bg-[#F8F9FA] border-b border-[#E9ECEF] select-none shrink-0 min-w-0">
        {/* ── Left group: Logo + Menus + Tabs ──────────────────────────── */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 min-w-0 flex-shrink min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-lg bg-[#4361EE]/10 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2.5" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight whitespace-nowrap hidden sm:inline">
              <span className="text-[#4361EE]">Eesha</span>
              <span className="text-gray-800"> Learn</span>
            </span>
          </div>

          {/* Divider - hidden on mobile */}
          <div className="w-px h-5 bg-gray-300 mx-0.5 shrink-0 hidden md:block" />

          {/* Menu items: File, Edit, View, Help - hidden on small screens */}
          <div className="items-center gap-0.5 shrink-0 hidden md:flex">
            {['File', 'Edit', 'View', 'Help'].map((item) => (
              <button
                key={item}
                className="px-2 py-1 text-sm text-[#495057] hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                onClick={() => showToast(`${item} menu coming soon`)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => showToast('Menu coming soon')}
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Divider - hidden on mobile */}
          <div className="w-px h-5 bg-gray-300 mx-0.5 shrink-0 hidden sm:block" />

          {/* Tab buttons: Design | Code | Simulate */}
          <div className="flex items-center shrink-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all border-b-2 relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#4361EE] text-gray-900 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                <span className="hidden xs:inline">{tab.label}</span>
                {tab.id === 'simulate' && simulation.isRunning && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right group: Actions ─────────────────────────────────────── */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* + Component button */}
          <button
            onClick={togglePalette}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4361EE] text-white hover:bg-[#3a56d4] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Components</span>
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#495057] hover:bg-gray-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="hidden md:inline">Export</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E9ECEF] rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                <button
                  onClick={handleSave}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Project
                </button>
                <button
                  onClick={handleLoad}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Load Project
                </button>
                <div className="h-px bg-[#E9ECEF] my-1" />
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Export JSON
                </button>
                <label className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportJSON}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Share button - hidden on small screens */}
          <button
            onClick={() => showToast('Share link copied')}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-[#495057] hover:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span className="hidden md:inline">Share</span>
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 2 — SECONDARY TOOLBAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-1.5 sm:px-3 h-8 sm:h-9 md:h-10 bg-[#F8F9FA] border-b border-[#E9ECEF] select-none shrink-0 overflow-x-auto">
        {/* ── Left: Controls ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Stop button */}
          <button
            title="Stop"
            onClick={handleReset}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>

          {/* Pause button - hidden on very small screens */}
          <button
            title={simulation.isPaused ? 'Resume' : 'Pause'}
            onClick={() => simulation.isRunning && setPaused(!simulation.isPaused)}
            className="hidden xs:flex w-7 h-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            {simulation.isPaused ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </button>

          {/* Settings button - hidden on small screens */}
          <button
            title="Settings"
            onClick={() => showToast('Settings coming soon')}
            className="hidden sm:flex w-7 h-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Build Simulatable Part button - hidden on mobile */}
          <button
            onClick={() => showToast('Build coming soon')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4361EE] text-white hover:bg-[#3a56d4] transition-colors ml-1"
          >
            Build Simulatable Part
          </button>

          {/* Simulate (play/stop) button */}
          <button
            onClick={handleStartStop}
            title={simulation.isRunning ? 'Stop simulation' : 'Compile & Run'}
            disabled={compileStatus === 'compiling'}
            className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-white transition-colors ${
              compileStatus === 'compiling'
                ? 'bg-amber-500 cursor-wait'
                : simulation.isRunning
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-[#4361EE] hover:bg-[#3a56d4]'
            }`}
          >
            {compileStatus === 'compiling' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : simulation.isRunning ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Search button - hidden on very small screens */}
          <button
            title="Search"
            onClick={() => showToast('Search coming soon')}
            className="hidden xs:flex w-7 h-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* ── Right: Compile status + Elapsed time + Speed ─────────────── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Compile status indicator */}
          {compileStatus === 'compiling' && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="hidden sm:inline">Compiling</span>
            </span>
          )}
          {compileStatus === 'loaded' && simulation.isRunning && (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline">Running</span>
            </span>
          )}
          {compileStatus === 'error' && !simulation.isRunning && (
            <span className="flex items-center gap-1.5 text-[10px] text-red-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="hidden sm:inline">Error</span>
            </span>
          )}

          {/* Elapsed time (monospace) */}
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md bg-gray-100 text-[10px] font-mono text-gray-500 tabular-nums">
            {(simulation.elapsedTime ?? 0).toFixed(3)}s
          </div>

          {/* Speed percentage */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[10px] font-mono text-gray-500">
            {Math.round((simulation.speed ?? 1) * 100)}%
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left sidebar: Component Palette (full overlay on mobile, side panel on desktop) */}
        {showPalette && (activeTab === 'design' || activeTab === 'simulate') && <ComponentPalette />}

        {/* Center content: switched by active tab */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {activeTab === 'design' && <CanvasWorkspace />}

          {activeTab === 'code' && <CodeEditorPanel />}

          {activeTab === 'simulate' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Simulation canvas (same workspace but with live state) */}
              <div className="flex-1 overflow-hidden">
                <CanvasWorkspace />
              </div>
              {/* Serial Monitor (bottom panel when toggled on) */}
              {showSerialMonitor && (
                <div className="h-36 sm:h-48 shrink-0">
                  <SerialMonitor />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER — STATUS BAR
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="flex items-center justify-between px-1.5 sm:px-3 py-1 bg-[#F8F9FA] border-t border-[#E9ECEF] select-none shrink-0" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
        {/* Left: Brand + version */}
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] min-w-0">
          <span className="font-semibold text-gray-500">Eesha Learn</span>
          <span className="text-gray-300 hidden sm:inline">v2.2.0</span>
          <span className="text-gray-200 hidden sm:inline">|</span>
          <span className="text-gray-400 font-mono hidden md:inline">avr8js</span>
          <span className="text-gray-200 hidden md:inline">·</span>
          <span className="text-gray-400 font-mono hidden md:inline">ATmega328P</span>
        </div>

        {/* Right: Component count + Running/Idle status */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] shrink-0">
          <span className="text-gray-400 hidden sm:inline">
            {components.length} component{components.length !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-200 hidden sm:inline">|</span>
          {simulation.isRunning ? (
            <span className="text-[#4361EE] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4361EE] animate-pulse" />
              Running
            </span>
          ) : (
            <span className="text-gray-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              Idle
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
