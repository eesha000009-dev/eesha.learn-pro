'use client';

import React, { useCallback, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { CodeEditor } from '@/components/code-editor';
import { SchematicViewer } from '@/components/schematic-viewer';
import { ComponentPalette } from '@/components/component-palette';
import { ComponentInspector } from '@/components/component-inspector';
import { SimulationControls } from '@/components/simulation-controls';
import { SerialMonitor } from '@/components/serial-monitor';
import { TemplateGallery } from '@/components/template-gallery';
import { circuitTemplates } from '@/lib/templates';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PanelBottomClose,
  PanelBottomOpen,
  Settings,
  Download,
  Upload,
  HelpCircle,
  GraduationCap,
  Zap,
  Github,
  Menu,
} from 'lucide-react';

export default function HomePage() {
  const {
    showComponentPanel,
    toggleComponentPanel,
    showConsole,
    toggleConsole,
    addTab,
    setActiveTab,
    addComponent,
    clearComponents,
    zoom,
    setZoom,
    toggleGrid,
    editorTabs,
    closeTab,
    simulation,
  } = useSimulatorStore();

  // Initialize with default template on first load
  useEffect(() => {
    if (editorTabs.length === 0) {
      const blinkTemplate = circuitTemplates.find((t) => t.id === 'blink');
      if (blinkTemplate) {
        const sketchTab = {
          id: `sketch-${blinkTemplate.id}`,
          name: `${blinkTemplate.name}.ino`,
          language: 'c' as const,
          content: blinkTemplate.code,
          modified: false,
        };
        addTab(sketchTab);
        setActiveTab(sketchTab.id);

        const circuitTab = {
          id: `circuit-${blinkTemplate.id}`,
          name: `${blinkTemplate.name}.circuit.tsx`,
          language: 'circuit' as const,
          content: blinkTemplate.circuitCode,
          modified: false,
        };
        addTab(circuitTab);

        blinkTemplate.components.forEach((comp) => {
          addComponent({ ...comp });
        });
      }
    }
  }, []);

  const handleZoomIn = useCallback(() => setZoom(zoom + 0.1), [zoom, setZoom]);
  const handleZoomOut = useCallback(() => setZoom(zoom - 0.1), [zoom, setZoom]);
  const handleZoomReset = useCallback(() => setZoom(1), [setZoom]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
        {/* ===== HEADER ===== */}
        <header className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 select-none">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Cpu className="h-6 w-6 text-emerald-400" />
                <Zap className="h-2.5 w-2.5 text-amber-400 absolute -top-0.5 -right-0.5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">
                  <span className="text-emerald-400">Eesha</span>
                  <span className="text-zinc-300"> Learn</span>
                </h1>
                <p className="text-[9px] text-zinc-600 -mt-0.5 font-medium tracking-wider uppercase">
                  Circuit Simulator
                </p>
              </div>
            </div>
          </div>

          {/* Center: Templates + Actions */}
          <div className="flex items-center gap-2">
            <TemplateGallery />
            <div className="w-px h-5 bg-zinc-800" />
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-zinc-300 text-xs gap-1 h-7"
              onClick={() => {
                // Export circuit JSON
                const data = JSON.stringify({
                  components: useSimulatorStore.getState().components,
                  code: editorTabs.find((t) => t.language === 'c')?.content || '',
                }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'eesha-circuit.json';
                a.click();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>

          {/* Right: View controls + Help */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                  onClick={() => setZoom(zoom + 0.1)}
                >
                  <span className="text-xs font-bold">+</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom In</TooltipContent>
            </Tooltip>

            <span className="text-[10px] text-zinc-600 font-mono min-w-[2.5rem] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                  onClick={() => setZoom(zoom - 0.1)}
                >
                  <span className="text-xs font-bold">−</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom Out</TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-zinc-800 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                  onClick={toggleComponentPanel}
                >
                  {showComponentPanel ? (
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  ) : (
                    <PanelLeftOpen className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle Component Panel</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                  onClick={toggleConsole}
                >
                  {showConsole ? (
                    <PanelBottomClose className="h-3.5 w-3.5" />
                  ) : (
                    <PanelBottomOpen className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle Console</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* ===== SIMULATION CONTROLS BAR ===== */}
        <SimulationControls />

        {/* ===== MAIN WORKSPACE ===== */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left: Component Palette */}
            {showComponentPanel && (
              <>
                <ResizablePanel defaultSize={14} minSize={10} maxSize={20}>
                  <ComponentPalette />
                </ResizablePanel>
                <ResizableHandle />
              </>
            )}

            {/* Center: Editor + Viewer */}
            <ResizablePanel defaultSize={showComponentPanel ? 58 : 68}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Code Editor */}
                <ResizablePanel defaultSize={50} minSize={25}>
                  <CodeEditor />
                </ResizablePanel>
                <ResizableHandle />
                {/* Schematic/PCB Viewer */}
                <ResizablePanel defaultSize={50} minSize={25}>
                  <SchematicViewer />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            {/* Right: Inspector */}
            <ResizablePanel defaultSize={18} minSize={14} maxSize={25}>
              <ComponentInspector />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* ===== BOTTOM: Serial Monitor ===== */}
        {showConsole && (
          <div className="h-48 resize-y overflow-hidden">
            <SerialMonitor />
          </div>
        )}

        {/* ===== FOOTER ===== */}
        <footer className="flex items-center justify-between px-4 py-1 bg-zinc-900 border-t border-zinc-800 select-none">
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              Eesha Learn v1.0
            </span>
            <span>•</span>
            <span>Built with tscircuit + avr8js</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              MIT Licensed
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span>
              {simulation.isRunning ? (
                <span className="text-emerald-400">● Simulation Running</span>
              ) : (
                <span className="text-zinc-600">○ Idle</span>
              )}
            </span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
