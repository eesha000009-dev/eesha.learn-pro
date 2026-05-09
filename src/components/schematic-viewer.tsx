'use client';

import React, { useCallback } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { getBoardById } from '@/lib/board-registry';
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
    boardType,
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

          {/* Active board rendering */}
          {renderActiveBoard(boardType)}

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

function renderActiveBoard(boardId: string) {
  const board = getBoardById(boardId);
  if (!board) return null;

  const isArduino = board.id.includes('arduino');
  const isPico = board.id.includes('pico');
  const isEsp32 = board.id.includes('esp32');
  const isStm32 = board.id.includes('stm32');
  const isNodemcu = board.id.includes('nodemcu');

  if (isArduino) {
    return renderArduinoBoard(board);
  }
  if (isPico) {
    return renderPicoBoard(board);
  }
  if (isEsp32 || isNodemcu) {
    return renderEsp32Board(board);
  }
  if (isStm32) {
    return renderStm32Board(board);
  }

  // Generic board
  return (
    <g transform="translate(350, 100)">
      <rect x={-35} y={-25} width={70} height={50} rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
      <text x={0} y={2} textAnchor="middle" fill="#94a3b8" fontSize={7} fontWeight="bold">{board.name}</text>
      <text x={0} y={12} textAnchor="middle" fill="#64748b" fontSize={6}>{board.mcu || ''}</text>
      {/* Pins */}
      {Array.from({ length: Math.min(board.pinCount.digital, 20) }, (_, i) => {
        const side = i < 10 ? -1 : 1;
        const row = i < 10 ? i : i - 10;
        return (
          <circle
            key={i}
            cx={side * 38}
            cy={-20 + row * 4.5}
            r={1.5}
            fill="#475569"
            stroke="#64748b"
            strokeWidth={0.5}
          />
        );
      })}
    </g>
  );
}

function renderArduinoBoard(board: { thumbnailColor: string; mcu?: string; name: string }) {
  return (
    <g transform="translate(350, 120)">
      {/* Board body */}
      <rect x={-40} y={-30} width={80} height={60} rx={3} fill="#0078D7" stroke="#005A9E" strokeWidth={1.5} opacity={0.9} />
      <rect x={-36} y={-26} width={72} height={52} rx={2} fill="#005A9E" opacity={0.5} />

      {/* MCU chip */}
      <rect x={-10} y={-12} width={20} height={24} rx={1} fill="#1e293b" stroke="#475569" strokeWidth={0.5} />
      <circle cx={-6} cy={-8} r={1} fill="#334155" />
      <circle cx={6} cy={-8} r={1} fill="#334155" />
      <circle cx={-6} cy={8} r={1} fill="#334155" />
      <circle cx={6} cy={8} r={1} fill="#334155" />

      {/* USB connector */}
      <rect x={-32} y={-24} width={14} height={10} rx={1} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
      <rect x={-30} y={-22} width={10} height={6} rx={0.5} fill="#1e293b" />

      {/* Power LED */}
      <circle cx={20} cy={-20} r={2} fill="#22c55e" opacity={0.8} />
      <circle cx={20} cy={-20} r={4} fill="#22c55e" opacity={0.2} />
      <circle cx={26} cy={-20} r={2} fill="#eab308" opacity={0.6} />

      {/* Pin headers - Digital (top) */}
      {Array.from({ length: 14 }, (_, i) => (
        <g key={`dp-${i}`}>
          <circle cx={-35 + i * 5} cy={-30} r={1.5} fill="#374151" stroke="#6b7280" strokeWidth={0.5} />
          <text x={-35 + i * 5} y={-34} textAnchor="middle" fill="#64748b" fontSize={4}>{i}</text>
        </g>
      ))}

      {/* Pin headers - Analog (bottom) */}
      {Array.from({ length: 6 }, (_, i) => (
        <g key={`ap-${i}`}>
          <circle cx={-20 + i * 5} cy={30} r={1.5} fill="#374151" stroke="#6b7280" strokeWidth={0.5} />
          <text x={-20 + i * 5} y={38} textAnchor="middle" fill="#94a3b8" fontSize={4}>A{i}</text>
        </g>
      ))}

      {/* Pin headers - Power (bottom) */}
      {['RST', '3V3', '5V', 'GND', 'VIN'].map((label, i) => (
        <g key={`pwr-${i}`}>
          <circle cx={15 + i * 5} cy={30} r={1.5} fill="#374151" stroke="#6b7280" strokeWidth={0.5} />
          <text x={15 + i * 5} y={38} textAnchor="middle" fill="#f87171" fontSize={3}>{label}</text>
        </g>
      ))}

      {/* ICSP header */}
      <rect x={-38} y={0} width={8} height={6} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      {Array.from({ length: 3 }, (_, i) => (
        <circle key={`icsp-${i}`} cx={-35 + i * 2.5} cy={1.5} r={0.8} fill="#475569" />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <circle key={`icsp2-${i}`} cx={-35 + i * 2.5} cy={4.5} r={0.8} fill="#475569" />
      ))}

      {/* Mounting holes */}
      <circle cx={-35} cy={24} r={3} fill="none" stroke="#005A9E" strokeWidth={0.8} />
      <circle cx={35} cy={24} r={3} fill="none" stroke="#005A9E" strokeWidth={0.8} />

      {/* Board label */}
      <text x={0} y={-18} textAnchor="middle" fill="#e2e8f0" fontSize={5} fontWeight="bold">ARDUINO UNO</text>
      <text x={0} y={20} textAnchor="middle" fill="#94a3b8" fontSize={4}>{board.mcu || 'ATmega328P'}</text>
    </g>
  );
}

function renderPicoBoard(board: { thumbnailColor: string; mcu?: string; name: string }) {
  return (
    <g transform="translate(350, 120)">
      <rect x={-45} y={-10} width={90} height={20} rx={2} fill="#1B5E20" stroke="#2E7D32" strokeWidth={1.5} />
      {/* USB-C */}
      <rect x={-44} y={-5} width={8} height={10} rx={1} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
      {/* BOOT button */}
      <circle cx={-30} cy={5} r={2.5} fill="#374151" stroke="#6b7280" strokeWidth={0.5} />
      <text x={-30} y={6.5} textAnchor="middle" fill="#9ca3af" fontSize={3}>B</text>
      {/* LED */}
      <circle cx={-22} cy={-5} r={1.5} fill="#22c55e" opacity={0.8} />
      {/* MCU */}
      <rect x={-5} y={-7} width={16} height={14} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      {/* Pins along both sides */}
      {Array.from({ length: 20 }, (_, i) => {
        const side = i < 10 ? -1 : 1;
        const row = i < 10 ? i : i - 10;
        return <circle key={i} cx={side * 44} cy={-8 + row * 1.8} r={1.2} fill="#374151" stroke="#6b7280" strokeWidth={0.3} />;
      })}
      <text x={15} y={2} textAnchor="middle" fill="#a5d6a7" fontSize={5} fontWeight="bold">PICO</text>
    </g>
  );
}

function renderEsp32Board(board: { thumbnailColor: string; mcu?: string; name: string }) {
  return (
    <g transform="translate(350, 120)">
      <rect x={-40} y={-20} width={80} height={40} rx={3} fill="#E65100" stroke="#BF360C" strokeWidth={1.5} opacity={0.9} />
      {/* USB */}
      <rect x={-35} y={-14} width={12} height={8} rx={1} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
      {/* Antenna */}
      <rect x={15} y={-16} width={20} height={12} rx={1} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      <text x={25} y={-9} textAnchor="middle" fill="#64748b" fontSize={4}>ANT</text>
      {/* MCU */}
      <rect x={-8} y={-10} width={16} height={20} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      {/* LEDs */}
      <circle cx={18} cy={-8} r={1.5} fill="#22c55e" opacity={0.8} />
      <circle cx={24} cy={-8} r={1.5} fill="#3b82f6" opacity={0.8} />
      {/* Pins */}
      {Array.from({ length: 18 }, (_, i) => {
        const side = i < 9 ? -1 : 1;
        const row = i < 9 ? i : i - 9;
        return <circle key={i} cx={side * 39} cy={-15 + row * 3.5} r={1.3} fill="#374151" stroke="#6b7280" strokeWidth={0.3} />;
      })}
      <text x={-15} y={14} textAnchor="middle" fill="#ffcc80" fontSize={5} fontWeight="bold">ESP32</text>
      <text x={-15} y={19} textAnchor="middle" fill="#ffab40" fontSize={3}>{board.mcu || 'WROOM-32'}</text>
    </g>
  );
}

function renderStm32Board(board: { thumbnailColor: string; mcu?: string; name: string }) {
  return (
    <g transform="translate(350, 100)">
      <rect x={-35} y={-35} width={70} height={70} rx={3} fill="#4527A0" stroke="#311B92" strokeWidth={1.5} opacity={0.9} />
      {/* USB */}
      <rect x={-28} y={-32} width={12} height={8} rx={1} fill="#475569" stroke="#64748b" strokeWidth={0.5} />
      {/* MCU */}
      <rect x={-12} y={-14} width={24} height={28} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
      <text x={0} y={2} textAnchor="middle" fill="#64748b" fontSize={4}>{board.mcu || 'STM32'}</text>
      {/* Arduino pin headers */}
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={`a-${i}`} cx={-30 + i * 4} cy={-35} r={1.3} fill="#374151" stroke="#6b7280" strokeWidth={0.3} />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={`b-${i}`} cx={-30 + i * 4} cy={35} r={1.3} fill="#374151" stroke="#6b7280" strokeWidth={0.3} />
      ))}
      {/* Morpho headers */}
      {Array.from({ length: 20 }, (_, i) => (
        <circle key={`m-${i}`} cx={35} cy={-25 + i * 2.5} r={1} fill="#374151" stroke="#6b7280" strokeWidth={0.2} />
      ))}
      {/* LEDs */}
      <circle cx={20} cy={-25} r={1.5} fill="#22c55e" opacity={0.8} />
      <circle cx={25} cy={-25} r={1.5} fill="#3b82f6" opacity={0.6} />
      {/* Label */}
      <text x={0} y={-20} textAnchor="middle" fill="#d1c4e9" fontSize={4} fontWeight="bold">NUCLEO</text>
    </g>
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
