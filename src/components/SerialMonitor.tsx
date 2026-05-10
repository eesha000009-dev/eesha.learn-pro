'use client';

import React, { useCallback } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';

export function SerialMonitor() {
  const { simulation, clearSerialOutput } = useSimulatorStore();
  const { serialOutput } = simulation;
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serialOutput.length]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-zinc-300">Serial Monitor</h3>
          {simulation.isRunning && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              9600 baud
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 focus:outline-none">
            <option>9600</option>
            <option>115200</option>
            <option>19200</option>
            <option>38400</option>
            <option>57600</option>
          </select>
          <button
            onClick={clearSerialOutput}
            className="px-2 py-0.5 rounded text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {serialOutput.length === 0 ? (
          <div className="text-zinc-600 text-center py-4">
            {simulation.isRunning ? 'Waiting for serial output...' : 'Start simulation to see output'}
          </div>
        ) : (
          serialOutput.map((line, i) => (
            <div key={i} className="text-zinc-400 leading-relaxed">
              <span className="text-zinc-600 mr-2 select-none">{String(i + 1).padStart(4, ' ')}:</span>
              {line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800 shrink-0">
        <input
          type="text"
          placeholder="Send to serial..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const input = e.currentTarget;
              if (input.value.trim()) {
                useSimulatorStore.getState().addSerialOutput(`> ${input.value}`);
                input.value = '';
              }
            }
          }}
        />
        <button
          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] font-medium text-white transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
