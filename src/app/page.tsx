'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { CanvasWorkspace } from '@/components/workspace/CanvasWorkspace';
import { CodeEditorPanel } from '@/components/CodeEditorPanel';
import { SerialMonitor } from '@/components/SerialMonitor';
import { ComponentPalette } from '@/components/ComponentPalette';
import { WIRE_COLORS } from '@/lib/component-defs';
import type { ActiveTab } from '@/types';

// ─── Toast Notification (custom DOM toast) ──────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string) {
  let el = document.getElementById('toast-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-msg';
    el.style.cssText =
      'position:fixed;bottom:56px;left:50%;transform:translateX(-50%) translateY(8px);background:#27272a;color:#e4e4e7;padding:6px 16px;border-radius:8px;font-size:12px;z-index:999;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;border:1px solid #3f3f46;';
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

// ─── Small Toolbar Button ───────────────────────────────────────────────────
function ToolbarButton({
  title,
  onClick,
  children,
  active = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all ${
        active
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

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
    elapsedTime,
    speed,
    wireColor,
    setWireColor,
    components,
    editorTabs,
    exportDiagram,
    importDiagram,
    saveToLocalStorage,
    loadFromLocalStorage,
    workspace,
    setZoom,
  } = useSimulatorStore();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);
  const tickCount = useRef(0);

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

  // ─── Mock simulation tick (LED blink) ──────────────────────────────────
  const simulateTick = useCallback(() => {
    tickCount.current++;
    const store = useSimulatorStore.getState();
    const code = store.editorTabs.find((t) => t.language === 'arduino')?.content || '';
    const arduinoComp = store.components.find((c) => c.defId === 'arduino-uno');

    if (arduinoComp && code.includes('digitalWrite(13')) {
      const period = 20;
      const isHigh = Math.floor(tickCount.current / period) % 2 === 0;
      store.updateComponentState(arduinoComp.id, { ledOn: isHigh });
      store.setComponentPinValue(arduinoComp.id, 'd13', isHigh ? 5 : 0);
    }

    if (code.includes('Serial.println') && code.includes('LED ON') && tickCount.current % 20 === 0) {
      const isHigh = Math.floor(tickCount.current / 20) % 2 === 0;
      store.addSerialOutput(isHigh ? 'LED ON' : 'LED OFF');
    }
  }, []);

  // ─── Simulation interval ───────────────────────────────────────────────
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

  // ─── Handlers ──────────────────────────────────────────────────────────
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

  const handleReset = () => {
    resetSimulation();
    tickCount.current = 0;
    setRunning(false);
    setPaused(false);
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

  // ─── Tab definitions ───────────────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string; icon: JSX.Element }[] = [
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

  const { zoom } = workspace;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════
          ROW 1 — MAIN HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-3 h-11 bg-zinc-900 border-b border-zinc-800 select-none shrink-0">
        {/* ── Left group: Logo + Brand + Project name ────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Logo + Brand */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight whitespace-nowrap">
              <span className="text-emerald-400">Eesha</span>
              <span className="text-zinc-300"> Learn</span>
            </span>
          </div>

          {/* Project name */}
          <button
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-800 truncate max-w-[140px]"
            title="Rename project"
            onClick={() => showToast('Project rename coming soon')}
          >
            Untitled Project
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-zinc-800 mx-0.5 shrink-0" />

          {/* Menu items: File, Edit, View, Help */}
          <div className="flex items-center gap-0.5 shrink-0">
            {['File', 'Edit', 'View', 'Help'].map((item) => (
              <button
                key={item}
                className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-all"
                onClick={() => showToast(`${item} menu coming soon`)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-zinc-800 mx-0.5 shrink-0" />

          {/* Tab buttons: Design | Code | Simulate */}
          <div className="flex items-center shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 relative ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
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

        {/* ── Right group: Actions ───────────────────────────────────────── */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Simulation Start/Stop button */}
          <button
            onClick={handleStartStop}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              simulation.isRunning
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
            }`}
            title={simulation.isRunning ? 'Stop simulation' : 'Start simulation'}
          >
            {simulation.isRunning ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span className="hidden sm:inline">Stop</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span className="hidden sm:inline">Simulate</span>
              </>
            )}
          </button>

          {/* Component palette toggle */}
          <ToolbarButton
            title="Toggle Component Panel"
            onClick={togglePalette}
            active={showPalette}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <line x1="16" y1="8" x2="22" y2="8" />
              <line x1="16" y1="12" x2="22" y2="12" />
              <line x1="16" y1="16" x2="22" y2="16" />
            </svg>
          </ToolbarButton>

          {/* Serial monitor toggle */}
          <ToolbarButton
            title="Toggle Serial Monitor"
            onClick={toggleSerialMonitor}
            active={showSerialMonitor}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </ToolbarButton>

          {/* Export / Share dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <ToolbarButton
              title="Export & Share"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
              <span className="hidden md:inline">Export</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </ToolbarButton>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                <button
                  onClick={handleSave}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Load Project
                </button>
                <div className="h-px bg-zinc-800 my-1" />
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Export diagram.json
                </button>
                <label className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Import diagram.json
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportJSON}
                  />
                </label>
                <div className="h-px bg-zinc-800 my-1" />
                <button
                  onClick={() => { setShowExportMenu(false); showToast('Share link copied'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Share Project
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 2 — SECONDARY TOOLBAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 h-9 bg-zinc-900/80 border-b border-zinc-800 select-none shrink-0">
        {/* ── Left: Wire color swatches ──────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Wire</span>
          <div className="flex items-center gap-1">
            {WIRE_COLORS.slice(0, 6).map((wc) => (
              <button
                key={wc.color}
                onClick={() => setWireColor(wc.color)}
                className={`w-5 h-5 rounded-full transition-all hover:scale-110 ${
                  wireColor === wc.color
                    ? 'ring-2 ring-offset-1 ring-offset-zinc-900 ring-white scale-110'
                    : 'ring-1 ring-zinc-700'
                }`}
                style={{ backgroundColor: wc.color }}
                title={wc.name}
              />
            ))}
          </div>
        </div>

        {/* ── Center: Simulation controls (visible when running) ─────────── */}
        <div className="flex items-center gap-1">
          {simulation.isRunning && (
            <>
              {/* Stop */}
              <ToolbarButton title="Stop" onClick={handleStartStop}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </ToolbarButton>
              {/* Pause / Resume */}
              <ToolbarButton
                title={simulation.isPaused ? 'Resume' : 'Pause'}
                onClick={() => setPaused(!simulation.isPaused)}
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
              </ToolbarButton>
              {/* Reset */}
              <ToolbarButton title="Reset simulation" onClick={handleReset}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </ToolbarButton>
              {/* Divider */}
              <div className="w-px h-4 bg-zinc-800 mx-1" />
              {/* Running indicator */}
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Running
              </span>
            </>
          )}
        </div>

        {/* ── Right: Elapsed time + Speed + Zoom ─────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Elapsed time (monospace) */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/50 text-[10px] font-mono text-zinc-400 tabular-nums">
            {simulation.isRunning && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
            {(elapsedTime ?? 0).toFixed(3)}s
          </div>

          {/* Speed percentage */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/50 text-[10px] font-mono text-zinc-400">
            {Math.round((speed ?? 1) * 100)}%
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-zinc-800" />

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setZoom(zoom - 0.1)}
              className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              title="Zoom out"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
              </svg>
            </button>
            <span className="text-[10px] text-zinc-500 font-mono min-w-[2.5rem] text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(zoom + 0.1)}
              className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              title="Zoom in"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-1.5 h-6 flex items-center justify-center text-[10px] font-mono text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              title="Reset zoom to 100%"
            >
              1:1
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: Component Palette (visible in design/simulate tabs when toggled on) */}
        {showPalette && (activeTab === 'design' || activeTab === 'simulate') && <ComponentPalette />}

        {/* Center content: switched by active tab */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
                <div className="h-48 shrink-0">
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
      <footer className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-t border-zinc-800 select-none shrink-0">
        {/* Left: Brand + version */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="font-semibold text-zinc-400">Eesha Learn</span>
          <span className="text-zinc-700">v2.1.0</span>
          <span className="text-zinc-800">|</span>
          <span className="text-zinc-600 font-mono">avr8js</span>
          <span className="text-zinc-800">&middot;</span>
          <span className="text-zinc-600 font-mono">Arduino</span>
        </div>

        {/* Right: Component count + Running/Idle status */}
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
