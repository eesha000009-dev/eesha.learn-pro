'use client';

import React, { useCallback, useState } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { getSimulation } from '@/lib/simulation-bridge';
import { getBoardById } from '@/lib/board-registry';
import {
  Play,
  Square,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Cpu,
  CircuitBoard,
} from 'lucide-react';

export function SimulationControls() {
  const {
    simulation,
    setRunning,
    setSpeed,
    resetSimulation,
    clearSerialOutput,
    clearErrors,
    addSerialOutput,
    addError,
    updatePinState,
    boardType,
    setBoardType,
    viewMode,
    setViewMode,
    installedBoardIds,
  } = useSimulatorStore();

  const [elapsed, setElapsed] = useState(0);
  const activeBoard = getBoardById(boardType);

  const handleStart = useCallback(async () => {
    setRunning(true);
    const sim = getSimulation();
    sim.onPinChange((compId, pins) => {
      updatePinState(compId, pins);
    });
    sim.onSerialOutput((line) => {
      addSerialOutput(line);
    });
    sim.onError((err) => {
      addError(err);
    });
    sim.start();
  }, [setRunning, updatePinState, addSerialOutput, addError]);

  const handleStop = useCallback(() => {
    setRunning(false);
    const sim = getSimulation();
    sim.stop();
  }, [setRunning]);

  const handleReset = useCallback(() => {
    resetSimulation();
    clearSerialOutput();
    clearErrors();
    setElapsed(0);
    const sim = getSimulation();
    sim.reset();
  }, [resetSimulation, clearSerialOutput, clearErrors]);

  const handleSpeedChange = useCallback(
    (delta: number) => {
      const speeds = [0.25, 0.5, 1, 2, 4, 8];
      const currentIdx = speeds.indexOf(simulation.speed);
      const newIdx = Math.max(0, Math.min(speeds.length - 1, currentIdx + delta));
      setSpeed(speeds[newIdx]);
    },
    [simulation.speed, setSpeed]
  );

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
      {/* Active Board indicator */}
      <div className="flex items-center gap-1.5 mr-1">
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ backgroundColor: (activeBoard?.thumbnailColor || '#374151') + '30' }}
        >
          <CircuitBoard className="h-3 w-3" style={{ color: activeBoard?.thumbnailColor || '#9ca3af' }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-zinc-200 leading-none">
            {activeBoard?.name || boardType}
          </span>
          <span className="text-[8px] text-zinc-600 leading-none mt-0.5">
            {activeBoard?.mcu || ''} {activeBoard?.architecture ? `• ${activeBoard.architecture.toUpperCase()}` : ''}
          </span>
        </div>
      </div>

      <div className="w-px h-5 bg-zinc-700 mx-1" />

      {/* View mode */}
      <div className="flex items-center gap-1 mr-2">
        {(['schematic', 'pcb', 'breadboard'] as const).map((mode) => (
          <button
            key={mode}
            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
              viewMode === mode
                ? 'bg-zinc-600 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setViewMode(mode)}
          >
            {mode === 'schematic' ? 'SCH' : mode === 'pcb' ? 'PCB' : 'BB'}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-zinc-700 mx-1" />

      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <button
          className={`p-1.5 rounded transition-colors ${
            simulation.isRunning
              ? 'text-red-400 hover:text-red-300 hover:bg-red-400/10'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
          onClick={handleStop}
          disabled={!simulation.isRunning}
          title="Stop"
        >
          <Square className="h-3.5 w-3.5" fill={simulation.isRunning ? 'currentColor' : 'none'} />
        </button>

        <button
          className={`p-1.5 rounded transition-colors ${
            simulation.isRunning
              ? 'text-emerald-400 bg-emerald-400/10'
              : 'text-zinc-300 hover:text-white hover:bg-emerald-400/10'
          }`}
          onClick={simulation.isRunning ? handleStop : handleStart}
          title={simulation.isRunning ? 'Pause' : 'Run Simulation'}
        >
          {simulation.isRunning ? (
            <Square className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4" fill="currentColor" />
          )}
        </button>

        <button
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
          onClick={handleReset}
          title="Reset"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="w-px h-5 bg-zinc-700 mx-1" />

      {/* Speed control */}
      <div className="flex items-center gap-1">
        <button
          className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          onClick={() => handleSpeedChange(-1)}
          title="Slow down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] font-mono text-emerald-400 min-w-[2.5rem] text-center">
          {simulation.speed}x
        </span>
        <button
          className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          onClick={() => handleSpeedChange(1)}
          title="Speed up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1" />

      {/* Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div
            className={`h-2 w-2 rounded-full ${
              simulation.isRunning
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          <span className="text-[10px] text-zinc-500">
            {simulation.isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>
    </div>
  );
}
