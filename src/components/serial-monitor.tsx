'use client';

import React, { useRef, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Terminal } from 'lucide-react';

export function SerialMonitor() {
  const { simulation, clearSerialOutput, showConsole } = useSimulatorStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [simulation.serialOutput, simulation.errors]);

  if (!showConsole) return null;

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Serial Monitor
          </span>
          <span className="text-[10px] text-zinc-600">9600 baud</span>
        </div>
        <button
          className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          onClick={clearSerialOutput}
          title="Clear"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Output */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-2 font-mono text-xs">
        {/* Errors */}
        {simulation.errors.map((error, i) => (
          <div key={`err-${i}`} className="text-red-400 mb-0.5">
            <span className="text-red-500 mr-1">[ERROR]</span>
            {error}
          </div>
        ))}

        {/* Serial output */}
        {simulation.serialOutput.length === 0 && !simulation.isRunning && (
          <div className="text-zinc-700 text-center py-4">
            <Terminal className="h-6 w-6 mx-auto mb-1 opacity-30" />
            <p className="text-[10px]">Waiting for serial output...</p>
            <p className="text-[10px] text-zinc-800 mt-0.5">
              Click Run to start the simulation
            </p>
          </div>
        )}
        {simulation.serialOutput.map((line, i) => (
          <div key={`line-${i}`} className="text-emerald-400/80 leading-relaxed">
            <span className="text-zinc-700 mr-2 select-none">{String(i + 1).padStart(3, ' ')}</span>
            {line}
          </div>
        ))}

        {/* Cursor */}
        {simulation.isRunning && (
          <div className="flex items-center text-emerald-500 mt-0.5">
            <span className="text-zinc-700 mr-2 select-none">{'   '}</span>
            <span className="inline-block w-1.5 h-3.5 bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
