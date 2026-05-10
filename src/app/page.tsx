'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { CanvasWorkspace } from '@/components/workspace/CanvasWorkspace';
import { CodeEditorPanel } from '@/components/CodeEditorPanel';
import { SerialMonitor } from '@/components/SerialMonitor';
import { ComponentPalette } from '@/components/ComponentPalette';
import type { ActiveTab } from '@/types';

// ─── Toast Notification ─────────────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(msg: string) {
  let el = document.getElementById('toast-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-msg';
    el.style.cssText =
      'position:fixed;bottom:56px;left:50%;transform:translateX(-50%) translateY(8px);background:#495057;color:#f8f9fa;padding:6px 16px;border-radius:8px;font-size:12px;z-index:999;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;border:1px solid #dee2e6;';
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

  const { zoom } = workspace;

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════
          ROW 1 — MAIN HEADER (bg-[#F8F9FA], h-12, border-b border-[#E9ECEF])
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-3 h-12 bg-[#F8F9FA] border-b border-[#E9ECEF] select-none shrink-0">
        {/* ── Left group: Logo + Menus + Tabs ──────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#4361EE]/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4361EE" strokeWidth="2.5" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight whitespace-nowrap">
              <span className="text-[#4361EE]">Eesha</span>
              <span className="text-gray-800"> Learn</span>
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300 mx-0.5 shrink-0" />

          {/* Menu items: File, Edit, View, Help */}
          <div className="flex items-center gap-0.5 shrink-0">
            {['File', 'Edit', 'View', 'Help'].map((item) => (
              <button
                key={item}
                className="px-2.5 py-1 text-sm text-[#495057] hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                onClick={() => showToast(`${item} menu coming soon`)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300 mx-0.5 shrink-0" />

          {/* Tab buttons: Design | Code | Simulate | Upload */}
          <div className="flex items-center shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-all border-b-2 relative ${
                  activeTab === tab.id
                    ? 'border-[#4361EE] text-gray-900 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'simulate' && simulation.isRunning && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
            {/* Upload tab */}
            <button
              className="flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-all relative"
              onClick={() => showToast('Upload coming soon')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload
            </button>
          </div>
        </div>

        {/* ── Right group: Actions ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* + Component AI button */}
          <button
            onClick={togglePalette}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4361EE] text-white hover:bg-[#3a56d4] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Component AI
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#495057] hover:bg-gray-100 transition-colors"
            >
              Export
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
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
                  Export diagram.json
                </button>
                <label className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
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
              </div>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={() => showToast('Share link copied')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#495057] hover:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 2 — SECONDARY TOOLBAR (bg-[#F8F9FA], h-10, border-b)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 h-10 bg-[#F8F9FA] border-b border-[#E9ECEF] select-none shrink-0">
        {/* ── Left: Controls ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Stop button */}
          <button
            title="Stop"
            onClick={handleStartStop}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>

          {/* Pause button */}
          <button
            title={simulation.isPaused ? 'Resume' : 'Pause'}
            onClick={() => simulation.isRunning && setPaused(!simulation.isPaused)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
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

          {/* Settings button */}
          <button
            title="Settings"
            onClick={() => showToast('Settings coming soon')}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Build Simulatable Part button */}
          <button
            onClick={() => showToast('Build coming soon')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#4361EE] text-white hover:bg-[#3a56d4] transition-colors ml-1"
          >
            Build Simulatable Part
          </button>

          {/* Simulate (play) button */}
          <button
            onClick={handleStartStop}
            title={simulation.isRunning ? 'Stop simulation' : 'Start simulation'}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            {simulation.isRunning ? (
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

          {/* Search */}
          <button
            title="Search"
            onClick={() => showToast('Search coming soon')}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* ── Right: Elapsed time + Speed ──────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Running indicator */}
          {simulation.isRunning && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#4361EE] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4361EE] animate-pulse" />
              Running
            </span>
          )}

          {/* Elapsed time (monospace) */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[10px] font-mono text-gray-500 tabular-nums">
            {(elapsedTime ?? 0).toFixed(3)}s
          </div>

          {/* Speed percentage */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[10px] font-mono text-gray-500">
            {Math.round((speed ?? 1) * 100)}%
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: Component Palette (visible when toggled on) */}
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
      <footer className="flex items-center justify-between px-3 py-1 bg-[#F8F9FA] border-t border-[#E9ECEF] select-none shrink-0">
        {/* Left: Brand + version */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="font-semibold text-gray-500">Eesha Learn</span>
          <span className="text-gray-300">v2.1.0</span>
          <span className="text-gray-200">|</span>
          <span className="text-gray-400 font-mono">avr8js</span>
          <span className="text-gray-200">·</span>
          <span className="text-gray-400 font-mono">Arduino</span>
        </div>

        {/* Right: Component count + Running/Idle status */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-gray-400">
            {components.length} component{components.length !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-200">|</span>
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
