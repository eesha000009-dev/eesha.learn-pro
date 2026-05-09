'use client';

import React, { useCallback } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import type { CircuitComponent } from '@/types';

interface SchematicViewerProps {
  className?: string;
}

export function SchematicViewer({ className = '' }: SchematicViewerProps) {
  const {
    components,
    selectedComponentId,
    setSelectedComponent,
    zoom,
    showGrid,
    viewMode,
    simulation,
  } = useSimulatorStore();

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      // Check if clicked on a component
      const clickedComponent = components.find((c) => {
        const dx = Math.abs(c.x - x);
        const dy = Math.abs(c.y - y);
        return dx < 30 && dy < 20;
      });
      setSelectedComponent(clickedComponent?.id ?? null);
    },
    [components, zoom, setSelectedComponent]
  );

  const renderComponent = (comp: CircuitComponent) => {
    const isSelected = comp.id === selectedComponentId;
    const simPins = simulation.pinStates[comp.id];

    return (
      <g
        key={comp.id}
        transform={`translate(${comp.x}, ${comp.y}) rotate(${comp.rotation})`}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedComponent(comp.id);
        }}
      >
        {/* Selection highlight */}
        {isSelected && (
          <rect
            x={-38}
            y={-18}
            width={76}
            height={36}
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="4,2"
            rx={4}
          />
        )}

        {/* Component body */}
        {renderComponentBody(comp, simPins)}
      </g>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
            {viewMode === 'schematic' ? 'Schematic' : viewMode === 'pcb' ? 'PCB Layout' : 'Breadboard'}
          </span>
          <span className="text-[10px] text-zinc-500 bg-zinc-700 px-1.5 py-0.5 rounded">
            {zoom.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-1 text-zinc-500">
          <span className="text-[10px]">{components.length} components</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 relative overflow-auto"
        onClick={handleCanvasClick}
        style={{ cursor: 'crosshair' }}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            minWidth: 800,
            minHeight: 600,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Background */}
          <rect width="100%" height="100%" fill="#18181b" />

          {/* Grid */}
          {showGrid && (
            <g>
              {Array.from({ length: 40 }, (_, i) => (
                <line
                  key={`vg-${i}`}
                  x1={i * 20}
                  y1={0}
                  x2={i * 20}
                  y2={2000}
                  stroke="#27272a"
                  strokeWidth={0.5}
                />
              ))}
              {Array.from({ length: 30 }, (_, i) => (
                <line
                  key={`hg-${i}`}
                  x1={0}
                  y1={i * 20}
                  x2={2000}
                  y2={i * 20}
                  stroke="#27272a"
                  strokeWidth={0.5}
                />
              ))}
            </g>
          )}

          {/* Breadboard view mode */}
          {viewMode === 'breadboard' && renderBreadboard()}

          {/* Components */}
          {components.map(renderComponent)}
        </svg>

        {/* Watermark */}
        <div className="absolute bottom-3 right-3 text-[10px] text-zinc-700 font-medium pointer-events-none">
          Eesha Learn Simulator
        </div>
      </div>
    </div>
  );
}

function renderBreadboard() {
  return (
    <g>
      {/* Breadboard body */}
      <rect x={50} y={50} width={700} height={400} rx={8} fill="#f5f5dc" stroke="#8b7355" strokeWidth={2} />
      {/* Power rails top */}
      <line x1={70} y1={80} x2={730} y2={80} stroke="#cc0000" strokeWidth={1.5} />
      <line x1={70} y1={100} x2={730} y2={100} stroke="#0000cc" strokeWidth={1.5} />
      {/* Power rails bottom */}
      <line x1={70} y1={400} x2={730} y2={400} stroke="#cc0000" strokeWidth={1.5} />
      <line x1={70} y1={420} x2={730} y2={420} stroke="#0000cc" strokeWidth={1.5} />
      {/* Center divider */}
      <line x1={60} y1={250} x2={740} y2={250} stroke="#8b7355" strokeWidth={1} strokeDasharray="4,4" />
      {/* Hole rows */}
      {Array.from({ length: 25 }, (_, i) => (
        <g key={`row-${i}`}>
          {Array.from({ length: 30 }, (_, j) => (
            <circle
              key={`hole-${i}-${j}`}
              cx={80 + j * 20}
              cy={120 + (i < 12 ? i * 10 : (i + 2) * 10)}
              r={3}
              fill="#e8e8d0"
              stroke="#b0a890"
              strokeWidth={0.5}
            />
          ))}
        </g>
      ))}
      {/* Labels */}
      <text x={55} y={84} fill="#cc0000" fontSize={9} fontWeight="bold">+</text>
      <text x={55} y={104} fill="#0000cc" fontSize={9} fontWeight="bold">−</text>
      <text x={55} y={404} fill="#cc0000" fontSize={9} fontWeight="bold">+</text>
      <text x={55} y={424} fill="#0000cc" fontSize={9} fontWeight="bold">−</text>
    </g>
  );
}

function renderComponentBody(comp: CircuitComponent, simPins?: { pinNumber: number; pinName: string; value: 'high' | 'low' | 'floating'; voltage?: number }[]) {
  switch (comp.type) {
    case 'led':
      const isLedOn = simPins?.[0]?.value === 'high';
      const ledColor = comp.props?.color || '#ef4444';
      return (
        <g>
          <circle cx={0} cy={0} r={12} fill={isLedOn ? ledColor : '#374151'} stroke={ledColor} strokeWidth={1.5} opacity={isLedOn ? 1 : 0.5} />
          {isLedOn && (
            <>
              <circle cx={0} cy={0} r={18} fill={ledColor} opacity={0.15} />
              <circle cx={0} cy={0} r={25} fill={ledColor} opacity={0.08} />
            </>
          )}
          {/* Anode/Cathode lines */}
          <line x1={-25} y1={0} x2={-12} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={12} y1={0} x2={25} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          {/* Flat edge for cathode */}
          <line x1={8} y1={-12} x2={8} y2={12} stroke={ledColor} strokeWidth={2} />
          <text x={0} y={4} textAnchor="middle" fill={isLedOn ? 'white' : '#6b7280'} fontSize={7} fontWeight="bold">
            LED
          </text>
        </g>
      );

    case 'rgb_led':
      const rOn = simPins?.find(p => p.pinName === 'red')?.value === 'high';
      const gOn = simPins?.find(p => p.pinName === 'green')?.value === 'high';
      const bOn = simPins?.find(p => p.pinName === 'blue')?.value === 'high';
      const mixColor = `rgb(${rOn ? 255 : 30}, ${gOn ? 255 : 30}, ${bOn ? 255 : 30})`;
      const isRgbOn = rOn || gOn || bOn;
      return (
        <g>
          <circle cx={0} cy={0} r={14} fill={isRgbOn ? mixColor : '#374151'} stroke="#9ca3af" strokeWidth={1.5} />
          {isRgbOn && (
            <>
              <circle cx={0} cy={0} r={20} fill={mixColor} opacity={0.2} />
              <circle cx={0} cy={0} r={28} fill={mixColor} opacity={0.1} />
            </>
          )}
          {/* 4 legs */}
          <line x1={-30} y1={-5} x2={-14} y2={-5} stroke="#ef4444" strokeWidth={1.5} />
          <line x1={-30} y1={5} x2={-14} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={14} y1={-5} x2={30} y2={-5} stroke="#22c55e" strokeWidth={1.5} />
          <line x1={14} y1={5} x2={30} y2={5} stroke="#3b82f6" strokeWidth={1.5} />
          <text x={0} y={4} textAnchor="middle" fill={isRgbOn ? 'white' : '#6b7280'} fontSize={6} fontWeight="bold">
            RGB
          </text>
        </g>
      );

    case 'resistor':
      const resistance = comp.props?.resistance || 220;
      return (
        <g>
          <line x1={-30} y1={0} x2={-20} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={20} y1={0} x2={30} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          {/* Resistor body */}
          <rect x={-20} y={-6} width={40} height={12} rx={3} fill="#f5f5dc" stroke="#b0a890" strokeWidth={1} />
          {/* Color bands */}
          <rect x={-14} y={-6} width={3} height={12} fill={getBandColor(resistance, 0)} />
          <rect x={-8} y={-6} width={3} height={12} fill={getBandColor(resistance, 1)} />
          <rect x={-2} y={-6} width={3} height={12} fill={getBandColor(resistance, 2)} />
          <rect x={6} y={-6} width={3} height={12} fill="#d4a843" />
          <rect x={12} y={-6} width={3} height={12} fill="#d4a843" />
          <text x={0} y={22} textAnchor="middle" fill="#6b7280" fontSize={8}>
            {resistance >= 1000 ? `${resistance / 1000}kΩ` : `${resistance}Ω`}
          </text>
        </g>
      );

    case 'button':
      const isPressed = simPins?.[0]?.value === 'high';
      return (
        <g>
          {/* Button body */}
          <rect x={-15} y={-10} width={30} height={20} rx={3} fill="#374151" stroke={isPressed ? '#10b981' : '#6b7280'} strokeWidth={1.5} />
          {/* Button cap */}
          <rect x={-10} y={-7} width={20} height={14} rx={2} fill={isPressed ? '#065f46' : '#4b5563'} stroke="#9ca3af" strokeWidth={0.5} />
          {/* Pins */}
          <line x1={-20} y1={-5} x2={-15} y2={-5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={15} y1={-5} x2={20} y2={-5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={-20} y1={5} x2={-15} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={15} y1={5} x2={20} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <text x={0} y={3} textAnchor="middle" fill="#9ca3af" fontSize={7}>
            {isPressed ? 'ON' : 'BTN'}
          </text>
        </g>
      );

    case 'potentiometer':
      return (
        <g>
          <circle cx={0} cy={0} r={12} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
          <line x1={0} y1={0} x2={8} y2={-8} stroke="#d4a843" strokeWidth={2} strokeLinecap="round" />
          <circle cx={0} cy={0} r={3} fill="#6b7280" />
          <line x1={-25} y1={8} x2={-12} y2={8} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={0} y1={12} x2={0} y2={25} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={-25} y1={-8} x2={-12} y2={-8} stroke="#9ca3af" strokeWidth={1.5} />
          <text x={0} y={35} textAnchor="middle" fill="#6b7280" fontSize={7}>
            {comp.props?.resistance >= 1000 ? `${comp.props.resistance / 1000}kΩ` : `${comp.props?.resistance || 10}kΩ`}
          </text>
        </g>
      );

    case 'buzzer':
      const isBuzzing = simPins?.[0]?.value === 'high';
      return (
        <g>
          <circle cx={0} cy={0} r={14} fill="#1f2937" stroke={isBuzzing ? '#f59e0b' : '#6b7280'} strokeWidth={1.5} />
          <circle cx={0} cy={0} r={8} fill="#111827" />
          <text x={0} y={4} textAnchor="middle" fill={isBuzzing ? '#f59e0b' : '#6b7280'} fontSize={8} fontWeight="bold">
            BZ
          </text>
          {isBuzzing && (
            <>
              <text x={-22} y={-18} fill="#f59e0b" fontSize={10}>♪</text>
              <text x={15} y={-22} fill="#f59e0b" fontSize={8}>♫</text>
              <text x={18} y={-10} fill="#f59e0b" fontSize={12}>♪</text>
            </>
          )}
          <line x1={-25} y1={5} x2={-14} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={14} y1={5} x2={25} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
        </g>
      );

    case 'lcd':
      return (
        <g>
          <rect x={-50} y={-20} width={100} height={40} rx={3} fill="#0a4d2e" stroke="#065f46" strokeWidth={1.5} />
          <rect x={-44} y={-14} width={88} height={28} rx={2} fill="#006633" />
          {/* LCD pixels */}
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={-40 + i * 5} y={-8} width={4} height={8} fill="#33ff99" opacity={0.8} rx={0.5} />
          ))}
          <text x={0} y={15} textAnchor="middle" fill="#33ff99" fontSize={6} fontFamily="monospace">
            Eesha Learn
          </text>
          {/* Pins */}
          <line x1={-40} y1={20} x2={-40} y2={28} stroke="#9ca3af" strokeWidth={1} />
          <line x1={-35} y1={20} x2={-35} y2={28} stroke="#9ca3af" strokeWidth={1} />
          <line x1={-30} y1={20} x2={-30} y2={28} stroke="#9ca3af" strokeWidth={1} />
          <line x1={30} y1={20} x2={30} y2={28} stroke="#9ca3af" strokeWidth={1} />
          <line x1={35} y1={20} x2={35} y2={28} stroke="#9ca3af" strokeWidth={1} />
          <line x1={40} y1={20} x2={40} y2={28} stroke="#9ca3af" strokeWidth={1} />
        </g>
      );

    case 'servo':
      const angle = 90;
      return (
        <g>
          <rect x={-18} y={-12} width={36} height={24} rx={2} fill="#1e40af" stroke="#3b82f6" strokeWidth={1} />
          <circle cx={0} cy={0} r={6} fill="#1e3a8a" stroke="#60a5fa" strokeWidth={1} />
          <line x1={0} y1={0} x2={(Math.cos((angle * Math.PI) / 180) * 5).toFixed(1)} y2={(-Math.sin((angle * Math.PI) / 180) * 5).toFixed(1)} stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
          <line x1={-25} y1={8} x2={-18} y2={8} stroke="#cc0000" strokeWidth={1.5} />
          <line x1={-25} y1={0} x2={-18} y2={0} stroke="#f97316" strokeWidth={1.5} />
          <line x1={-25} y1={-8} x2={-18} y2={-8} stroke="#6b7280" strokeWidth={1.5} />
          <text x={0} y={-18} textAnchor="middle" fill="#60a5fa" fontSize={7}>Servo</text>
        </g>
      );

    case 'photoresistor':
      return (
        <g>
          <circle cx={0} cy={0} r={10} fill="#8b6914" stroke="#a07d28" strokeWidth={1.5} opacity={0.8} />
          <path d="M -5 -3 Q 0 -7 5 -3 Q 0 7 -5 3 Z" fill="#cd9b1d" opacity={0.6} />
          <line x1={-25} y1={0} x2={-10} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={10} y1={0} x2={25} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <text x={0} y={20} textAnchor="middle" fill="#6b7280" fontSize={7}>LDR</text>
        </g>
      );

    case 'seven_segment':
      return (
        <g>
          <rect x={-20} y={-25} width={40} height={50} rx={2} fill="#111827" stroke="#374151" strokeWidth={1.5} />
          {/* Segment '8' display */}
          <text x={0} y={8} textAnchor="middle" fill="#ef4444" fontSize={28} fontWeight="bold" fontFamily="monospace">
            8
          </text>
          <line x1={-20} y1={5} x2={-25} y2={5} stroke="#9ca3af" strokeWidth={1} />
          <line x1={-20} y1={-5} x2={-25} y2={-5} stroke="#9ca3af" strokeWidth={1} />
          <line x1={-20} y1={15} x2={-25} y2={15} stroke="#9ca3af" strokeWidth={1} />
        </g>
      );

    case 'motor':
      return (
        <g>
          <rect x={-14} y={-14} width={28} height={28} rx={3} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
          <circle cx={0} cy={0} r={8} fill="#1f2937" stroke="#9ca3af" strokeWidth={1} />
          <circle cx={0} cy={0} r={3} fill="#6b7280" />
          <line x1={-25} y1={5} x2={-14} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={14} y1={5} x2={25} y2={5} stroke="#9ca3af" strokeWidth={1.5} />
          <text x={0} y={3} textAnchor="middle" fill="#9ca3af" fontSize={7}>M</text>
        </g>
      );

    case 'battery':
      return (
        <g>
          <rect x={-12} y={-15} width={24} height={30} rx={3} fill="#1e3a8a" stroke="#3b82f6" strokeWidth={1.5} />
          <rect x={-3} y={-18} width={6} height={3} fill="#3b82f6" />
          <text x={0} y={0} textAnchor="middle" fill="#60a5fa" fontSize={7} fontWeight="bold">9V</text>
          <line x1={-25} y1={5} x2={-12} y2={5} stroke="#cc0000" strokeWidth={1.5} />
          <line x1={12} y1={-5} x2={25} y2={-5} stroke="#6b7280" strokeWidth={1.5} />
        </g>
      );

    default:
      return (
        <g>
          <rect x={-20} y={-12} width={40} height={24} rx={3} fill="#374151" stroke="#6b7280" strokeWidth={1} />
          <text x={0} y={4} textAnchor="middle" fill="#9ca3af" fontSize={8}>
            {comp.type}
          </text>
          <line x1={-25} y1={0} x2={-20} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
          <line x1={20} y1={0} x2={25} y2={0} stroke="#9ca3af" strokeWidth={1.5} />
        </g>
      );
  }
}

function getBandColor(resistance: number, bandIndex: number): string {
  const colors = ['#000000', '#964B00', '#FF0000', '#FF8C00', '#FFFF00', '#00FF00', '#0000FF', '#800080', '#808080', '#FFFFFF'];
  const digits = resistance.toString().split('').map(Number);
  if (bandIndex === 0 && digits.length > 0) return colors[digits[0]];
  if (bandIndex === 1 && digits.length > 1) return colors[digits[1]];
  if (bandIndex === 2) {
    if (resistance < 100) return colors[Math.log10(resistance / (digits[0] * 10 + digits[1]))] || '#000000';
    return '#FF0000'; // multiplier
  }
  return '#000000';
}
