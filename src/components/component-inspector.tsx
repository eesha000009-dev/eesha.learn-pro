'use client';

import React from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw, Copy } from 'lucide-react';

export function ComponentInspector() {
  const {
    selectedComponentId,
    components,
    updateComponent,
    removeComponent,
    setSelectedComponent,
    simulation,
  } = useSimulatorStore();

  const component = components.find((c) => c.id === selectedComponentId);

  if (!component) {
    return (
      <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
        <div className="px-3 py-2 border-b border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Inspector
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs text-center px-4">
          <p>Select a component on the canvas to inspect its properties</p>
        </div>
      </div>
    );
  }

  const simPins = simulation.pinStates[component.id];

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Inspector
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Component info */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-zinc-200">{component.name}</h4>
            <Badge variant="secondary" className="text-[9px] bg-zinc-800 text-zinc-400 border-0">
              {component.type}
            </Badge>
          </div>
          <p className="text-[10px] text-zinc-600 font-mono">{component.id}</p>
        </div>

        {/* Position */}
        <div>
          <h5 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Position
          </h5>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-600">X</label>
              <input
                type="number"
                value={component.x}
                onChange={(e) =>
                  updateComponent(component.id, { x: Number(e.target.value) })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600">Y</label>
              <input
                type="number"
                value={component.y}
                onChange={(e) =>
                  updateComponent(component.id, { y: Number(e.target.value) })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600">Rotation</label>
              <input
                type="number"
                value={component.rotation}
                onChange={(e) =>
                  updateComponent(component.id, { rotation: Number(e.target.value) })
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Properties */}
        {component.props && Object.keys(component.props).length > 0 && (
          <div>
            <h5 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Properties
            </h5>
            <div className="space-y-1.5">
              {Object.entries(component.props).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">{key}</span>
                  <span className="text-xs text-zinc-300 font-mono">
                    {typeof value === 'number'
                      ? key.includes('resistance')
                        ? `${value}Ω`
                        : key.includes('capacitance')
                        ? `${value}µF`
                        : key.includes('voltage')
                        ? `${value}V`
                        : value
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pin states (live) */}
        <div>
          <h5 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Pin States {simulation.isRunning && <span className="text-emerald-400">● LIVE</span>}
          </h5>
          <div className="space-y-1">
            {component.pins.map((pin) => (
              <div
                key={pin.pinNumber}
                className="flex items-center justify-between py-1 px-2 rounded bg-zinc-800/50"
              >
                <span className="text-[10px] text-zinc-500 font-mono">{pin.pinName}</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold uppercase ${
                      pin.value === 'high'
                        ? 'text-emerald-400'
                        : pin.value === 'low'
                        ? 'text-zinc-500'
                        : 'text-amber-400'
                    }`}
                  >
                    {pin.value}
                  </span>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      pin.value === 'high'
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : pin.value === 'low'
                        ? 'bg-zinc-600'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-zinc-800">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            onClick={() => {
              updateComponent(component.id, {
                x: component.x + 10,
                rotation: (component.rotation + 90) % 360,
              });
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Rotate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => {
              removeComponent(component.id);
              setSelectedComponent(null);
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
