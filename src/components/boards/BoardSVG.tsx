'use client';

import React, { useCallback, useState } from 'react';
import {
  getBoardPinout,
  type BoardPinout,
  type PinDefinition,
  type PinGroup,
  type BoardFeature,
} from '@/lib/board-pinouts';

// ========================== TYPES ==========================

interface BoardSVGProps {
  pinStates?: Record<string, { value: 'high' | 'low'; voltage: number }>;
  selectedPinId?: string;
  onPinClick?: (pinId: string, x: number, y: number) => void;
  onPinHover?: (pinId: string | null) => void;
  onPinLeave?: () => void;
  scale?: number;
}

// ========================== CONSTANTS ==========================

const U = 10; // 1 board unit = 10px for display
const PIN_RADIUS = 4;
const PIN_FILL_DEFAULT = '#2A2A2A';
const PIN_FILL_HIGH = '#10b981';
const PIN_FILL_SELECTED = '#ef4444';
const PIN_STROKE_DEFAULT = '#4A4A4A';
const PIN_STROKE_HIGH = '#065f46';
const PIN_STROKE_SELECTED = '#b91c1c';

const BOARD_COLORS: Record<string, { main: string; dark: string; light: string }> = {
  'arduino-uno': { main: '#00979D', dark: '#006D73', light: '#00ACB3' },
  'arduino-nano': { main: '#00979D', dark: '#006D73', light: '#00ACB3' },
  'esp32-devkit': { main: '#1A1A2E', dark: '#0F0F1A', light: '#252540' },
  'raspberry-pi-pico': { main: '#2D2D2D', dark: '#1A1A1A', light: '#3D3D3D' },
  'stm32-nucleo-f411re': { main: '#4A148C', dark: '#311B5E', light: '#6A1FAC' },
};

// ========================== MODULE-LEVEL SUB-COMPONENTS ==========================

function BoardPin({
  pin,
  pinState,
  isSelected,
  onPinClick,
  onPinHover,
  onPinLeave,
}: {
  pin: PinDefinition;
  pinState?: { value: 'high' | 'low'; voltage: number };
  isSelected: boolean;
  onPinClick?: (pinId: string, x: number, y: number) => void;
  onPinHover?: (pinId: string | null) => void;
  onPinLeave?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cx = pin.x * U;
  const cy = pin.y * U;
  const isHigh = pinState?.value === 'high';
  const isSelectedPin = isSelected;
  const r = hovered ? PIN_RADIUS + 1.5 : PIN_RADIUS;

  const fill = isSelectedPin ? PIN_FILL_SELECTED : isHigh ? PIN_FILL_HIGH : PIN_FILL_DEFAULT;
  const stroke = isSelectedPin ? PIN_STROKE_SELECTED : isHigh ? PIN_STROKE_HIGH : PIN_STROKE_DEFAULT;

  const altLabel =
    pin.altFunctions.length > 0 ? pin.altFunctions.map((a) => a.name).join(', ') : '';

  return (
    <g
      data-pin-id={pin.id}
      data-component-id={`pin-${pin.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onPinClick?.(pin.id, cx, cy);
      }}
      onMouseEnter={() => {
        setHovered(true);
        onPinHover?.(pin.id);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onPinLeave?.();
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow ring for HIGH pins */}
      {isHigh && (
        <circle cx={cx} cy={cy} r={r + 4} fill={PIN_FILL_HIGH} opacity={0.15} />
      )}
      {/* Selection ring */}
      {isSelectedPin && (
        <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={PIN_FILL_SELECTED} strokeWidth={1.5} opacity={0.6} />
      )}
      {/* Pin pad background */}
      <circle cx={cx} cy={cy} r={r + 1.5} fill="#1a1a1a" stroke="#333" strokeWidth={0.5} />
      {/* Pin circle */}
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.2} />
      {/* Pin 1 dot indicator for ground pins */}
      {pin.type === 'ground' && (
        <circle cx={cx} cy={cy} r={1.5} fill="#666" />
      )}
      {/* Tooltip on hover */}
      {hovered && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Tooltip background */}
          <rect
            x={cx - 40}
            y={cy - (pin.side === 'top' ? 30 : pin.side === 'bottom' ? 14 : 0) - 12}
            width={80}
            height={altLabel ? 30 : 20}
            rx={4}
            fill="#18181b"
            stroke="#3f3f46"
            strokeWidth={0.8}
            opacity={0.95}
          />
          {/* Pin name */}
          <text
            x={cx}
            y={cy - (pin.side === 'top' ? 30 : pin.side === 'bottom' ? 14 : 0) - 2}
            textAnchor="middle"
            fill="#e4e4e7"
            fontSize={8}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {pin.name}
          </text>
          {/* Alt function label */}
          {altLabel && (
            <text
              x={cx}
              y={cy - (pin.side === 'top' ? 30 : pin.side === 'bottom' ? 14 : 0) + 10}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize={6}
              fontFamily="monospace"
            >
              {altLabel}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

function USBConnector({ feature, scale: s }: { feature: BoardFeature; scale: number }) {
  const x = feature.x * s;
  const y = feature.y * s;
  const w = (feature.width || 3) * s;
  const h = (feature.height || 3) * s;
  const isTypeB = feature.label === 'USB-B';

  return (
    <g>
      {/* USB body */}
      <rect
        x={x} y={y} width={w} height={h}
        rx={isTypeB ? 4 : 2}
        fill="#b8bcc8"
        stroke="#8a8f9e"
        strokeWidth={1}
      />
      {/* Inner port */}
      <rect
        x={x + 2} y={y + 2} width={w - 4} height={h - 4}
        rx={isTypeB ? 3 : 1}
        fill="#e2e4ea"
        stroke="#c0c3cc"
        strokeWidth={0.5}
      />
      {/* Inner cavity */}
      <rect
        x={x + 4} y={y + 4} width={w - 8} height={h - 8}
        rx={1}
        fill="#3a3a4a"
      />
      {/* Type-B trapezoid top */}
      {isTypeB && (
        <path
          d={`M${x + w * 0.3},${y} L${x + w * 0.2},${y - 3} L${x + w * 0.8},${y - 3} L${x + w * 0.7},${y}`}
          fill="#b8bcc8"
          stroke="#8a8f9e"
          strokeWidth={0.5}
        />
      )}
      {/* Label */}
      {feature.label && (
        <text
          x={x + w / 2} y={y + h + 8}
          textAnchor="middle"
          fill="#64748b"
          fontSize={5}
          fontFamily="monospace"
        >
          {feature.label}
        </text>
      )}
    </g>
  );
}

function MCUChip({ feature, scale: s }: { feature: BoardFeature; scale: number }) {
  const x = feature.x * s;
  const y = feature.y * s;
  const w = (feature.width || 3) * s;
  const h = (feature.height || 5) * s;

  return (
    <g>
      {/* Chip shadow */}
      <rect
        x={x + 1.5} y={y + 1.5} width={w} height={h}
        rx={1}
        fill="#000"
        opacity={0.3}
      />
      {/* Chip body */}
      <rect
        x={x} y={y} width={w} height={h}
        rx={1}
        fill={feature.color || '#1e293b'}
        stroke="#334155"
        strokeWidth={0.8}
      />
      {/* Chip edge bevel */}
      <rect
        x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1}
        rx={0.8}
        fill="none"
        stroke="#475569"
        strokeWidth={0.3}
      />
      {/* Pin 1 dot */}
      <circle cx={x + 5} cy={y + 5} r={2} fill="#475569" />
      {/* Chip label line 1 */}
      {feature.label && (
        <text
          x={x + w / 2} y={y + h / 2 - 2}
          textAnchor="middle"
          fill="#64748b"
          fontSize={6}
          fontWeight="bold"
          fontFamily="monospace"
        >
          {feature.label.length > 10 ? feature.label.substring(0, 10) : feature.label}
        </text>
      )}
      {/* Chip label line 2 */}
      {feature.label && feature.label.length > 10 && (
        <text
          x={x + w / 2} y={y + h / 2 + 6}
          textAnchor="middle"
          fill="#64748b"
          fontSize={5}
          fontFamily="monospace"
        >
          {feature.label.substring(10)}
        </text>
      )}
      {/* DIP pin legs left */}
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={`mcu-l-${i}`} x={x - 4} y={y + 8 + i * ((h - 16) / 6)} width={5} height={2} rx={0.3} fill="#a0a0a8" />
      ))}
      {/* DIP pin legs right */}
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={`mcu-r-${i}`} x={x + w - 1} y={y + 8 + i * ((h - 16) / 6)} width={5} height={2} rx={0.3} fill="#a0a0a8" />
      ))}
    </g>
  );
}

function LEDComponent({ feature, scale: s, isOn }: { feature: BoardFeature; scale: number; isOn: boolean }) {
  const x = feature.x * s;
  const y = feature.y * s;
  const size = (feature.width || 0.8) * s;
  const color = feature.color || '#22c55e';

  return (
    <g>
      {/* LED glow */}
      {isOn && (
        <>
          <circle cx={x + size / 2} cy={y + size / 2} r={size * 1.2} fill={color} opacity={0.2} />
          <circle cx={x + size / 2} cy={y + size / 2} r={size * 0.8} fill={color} opacity={0.1} />
        </>
      )}
      {/* LED body */}
      <rect
        x={x} y={y} width={size} height={size}
        rx={1}
        fill={isOn ? color : '#1a1a2a'}
        stroke={color}
        strokeWidth={0.6}
        opacity={isOn ? 1 : 0.6}
      />
      {/* Label */}
      {feature.label && (
        <text
          x={x + size / 2} y={y + size + 6}
          textAnchor="middle"
          fill={isOn ? color : '#4a5568'}
          fontSize={4}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {feature.label}
        </text>
      )}
    </g>
  );
}

function ButtonComponent({ feature, scale: s }: { feature: BoardFeature; scale: number }) {
  const x = feature.x * s;
  const y = feature.y * s;
  const w = (feature.width || 1.5) * s;
  const h = (feature.height || 1.5) * s;

  return (
    <g>
      {/* Button base */}
      <rect
        x={x} y={y} width={w} height={h}
        rx={2}
        fill="#3a3a4a"
        stroke="#5a5a6a"
        strokeWidth={0.8}
      />
      {/* Button cap */}
      <rect
        x={x + 2} y={y + 2} width={w - 4} height={h - 4}
        rx={1.5}
        fill="#6b6b7b"
        stroke="#8a8a9a"
        strokeWidth={0.5}
      />
      {/* Button highlight */}
      <rect
        x={x + 3} y={y + 3} width={w - 6} height={(h - 4) / 2}
        rx={1}
        fill="#7a7a8a"
        opacity={0.5}
      />
      {/* Label */}
      {feature.label && (
        <text
          x={x + w / 2} y={y + h + 7}
          textAnchor="middle"
          fill="#64748b"
          fontSize={4}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {feature.label}
        </text>
      )}
    </g>
  );
}

function CrystalOscillator({ feature, scale: s }: { feature: BoardFeature; scale: number }) {
  const x = feature.x * s;
  const y = feature.y * s;
  const w = (feature.width || 1.2) * s;
  const h = (feature.height || 0.6) * s;

  return (
    <g>
      {/* Crystal body */}
      <rect
        x={x} y={y} width={w} height={h}
        rx={1}
        fill="#c0c0cc"
        stroke="#9a9aa8"
        strokeWidth={0.6}
      />
      {/* Crystal highlight */}
      <rect
        x={x + 1} y={y + 0.5} width={w - 2} height={h / 2 - 0.5}
        rx={0.5}
        fill="#d8d8e4"
        opacity={0.6}
      />
      {/* Leads */}
      <line x1={x + 2} y1={y + h} x2={x + 2} y2={y + h + 3} stroke="#a0a0a8" strokeWidth={0.8} />
      <line x1={x + w - 2} y1={y + h} x2={x + w - 2} y2={y + h + 3} stroke="#a0a0a8" strokeWidth={0.8} />
      {/* Label */}
      {feature.label && (
        <text
          x={x + w / 2} y={y + h + 9}
          textAnchor="middle"
          fill="#64748b"
          fontSize={4}
          fontFamily="monospace"
        >
          {feature.label}
        </text>
      )}
    </g>
  );
}

function VoltageRegulator({ feature, scale: s }: { feature: BoardFeature; scale: number }) {
  const x = feature.x * s;
  const y = feature.y * s;
  const w = (feature.width || 1.2) * s;
  const h = (feature.height || 2) * s;

  return (
    <g>
      {/* Tab */}
      <rect x={x + 1} y={y - 3} width={w - 2} height={4} rx={0.5} fill="#5a5a6a" />
      {/* Body */}
      <rect
        x={x} y={y} width={w} height={h}
        rx={0.5}
        fill={feature.color || '#1e293b'}
        stroke="#334155"
        strokeWidth={0.5}
      />
      {/* Pins */}
      <line x1={x + 2} y1={y + h} x2={x + 2} y2={y + h + 3} stroke="#a0a0a8" strokeWidth={0.8} />
      <line x1={x + w / 2} y1={y + h} x2={x + w / 2} y2={y + h + 3} stroke="#a0a0a8" strokeWidth={0.8} />
      <line x1={x + w - 2} y1={y + h} x2={x + w - 2} y2={y + h + 3} stroke="#a0a0a8" strokeWidth={0.8} />
    </g>
  );
}

function MountingHole({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill="none" stroke="#005A6E" strokeWidth={1} />
      <circle cx={x} cy={y} r={3} fill="#18181b" stroke="#333" strokeWidth={0.8} />
      <circle cx={x} cy={y} r={1.5} fill="#0a0a0a" />
    </g>
  );
}

function BoardDefs({ boardId }: { boardId: string }) {
  const colors = BOARD_COLORS[boardId];
  if (!colors) return null;
  return (
    <defs>
      <linearGradient id={`board-grad-${boardId}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={colors.light} />
        <stop offset="50%" stopColor={colors.main} />
        <stop offset="100%" stopColor={colors.dark} />
      </linearGradient>
      <linearGradient id={`board-edge-${boardId}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={colors.light} />
        <stop offset="100%" stopColor={colors.dark} />
      </linearGradient>
      <filter id={`board-shadow-${boardId}`} x="-5%" y="-5%" width="115%" height="115%">
        <feDropShadow dx={3} dy={3} stdDeviation={5} floodColor="#000" floodOpacity={0.4} />
      </filter>
      <filter id={`pin-glow-${boardId}`} x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation={2} result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ========================== BOARD PIN RENDERING ==========================

function BoardPins({
  pins,
  pinStates,
  selectedPinId,
  onPinClick,
  onPinHover,
  onPinLeave,
}: {
  pins: PinDefinition[];
  pinStates?: Record<string, { value: 'high' | 'low'; voltage: number }>;
  selectedPinId?: string;
  onPinClick?: (pinId: string, x: number, y: number) => void;
  onPinHover?: (pinId: string | null) => void;
  onPinLeave?: () => void;
}) {
  return (
    <g>
      {pins.map((pin) => (
        <BoardPin
          key={pin.id}
          pin={pin}
          pinState={pinStates?.[pin.id]}
          isSelected={selectedPinId === pin.id}
          onPinClick={onPinClick}
          onPinHover={onPinHover}
          onPinLeave={onPinLeave}
        />
      ))}
    </g>
  );
}

// ========================== PIN HEADER RENDERING ==========================

function PinHeader({
  group,
  pins,
  s,
}: {
  group: PinGroup;
  pins: PinDefinition[];
  s: number;
}) {
  if (pins.length === 0) return null;

  const minX = Math.min(...pins.map((p) => p.x));
  const maxX = Math.max(...pins.map((p) => p.x));
  const minY = Math.min(...pins.map((p) => p.y));
  const maxY = Math.max(...pins.map((p) => p.y));
  const isHorizontal = group.side === 'top' || group.side === 'bottom';
  const isLeft = group.side === 'left';
  const isRight = group.side === 'right';

  let hx = 0;
  let hy = 0;
  let hw = 0;
  let hh = 0;

  if (isHorizontal) {
    hx = (minX - 0.3) * s;
    hy = group.side === 'top' ? (minY - 0.6) * s : (minY - 0.1) * s;
    hw = (maxX - minX + 0.6) * s;
    hh = 1.2 * s;
  } else if (isLeft) {
    hx = (minX - 0.7) * s;
    hy = (minY - 0.3) * s;
    hw = 1.4 * s;
    hh = (maxY - minY + 0.6) * s;
  } else {
    hx = (minX - 0.1) * s;
    hy = (minY - 0.3) * s;
    hw = 1.4 * s;
    hh = (maxY - minY + 0.6) * s;
  }

  return (
    <rect
      x={hx} y={hy} width={hw} height={hh}
      rx={1}
      fill="#1a1a2a"
      stroke="#2a2a3a"
      strokeWidth={0.5}
      opacity={0.8}
    />
  );
}

// ========================== ARDUINO UNO R3 ==========================

export function ArduinoUnoSVG(props: BoardSVGProps) {
  const {
    pinStates = {},
    selectedPinId,
    onPinClick,
    onPinHover,
    onPinLeave,
    scale: propScale,
  } = props;
  const s = propScale || U;
  const board = getBoardPinout('arduino-uno');
  if (!board) return null;

  const bw = board.boardWidth * s;
  const bh = board.boardHeight * s;

  return (
    <g data-component-id="board-arduino-uno">
      <BoardDefs boardId="arduino-uno" />

      {/* Board body with shadow */}
      <rect
        x={0} y={0} width={bw} height={bh}
        rx={6}
        fill={`url(#board-grad-arduino-uno)`}
        stroke="#005A6E"
        strokeWidth={1.5}
        filter="url(#board-shadow-arduino-uno)"
      />

      {/* PCB texture lines */}
      <g opacity={0.08}>
        {Array.from({ length: 40 }, (_, i) => (
          <line key={`trace-h-${i}`} x1={0} y1={i * 5.5} x2={bw} y2={i * 5.5} stroke="#fff" strokeWidth={0.3} />
        ))}
      </g>

      {/* ICSP area (darker region) */}
      <rect x={9 * s} y={7 * s} width={3 * s} height={4 * s} rx={2} fill="#006D73" opacity={0.5} />

      {/* Mounting holes */}
      <MountingHole x={10} y={10} />
      <MountingHole x={bw - 10} y={10} />
      <MountingHole x={10} y={bh - 10} />
      <MountingHole x={bw - 10} y={bh - 10} />

      {/* Pin headers (black strips) */}
      {board.pinGroups.map((group) => (
        <PinHeader key={group.id} group={group} pins={group.pinIds.map((id) => board.pins.find((p) => p.id === id)!).filter(Boolean)} s={s} />
      ))}

      {/* Features */}
      {board.features.map((f) => {
        if (f.type === 'usb') return <USBConnector key={f.id} feature={f} scale={s} />;
        if (f.type === 'chip') return <MCUChip key={f.id} feature={f} scale={s} />;
        if (f.type === 'led') return <LEDComponent key={f.id} feature={f} scale={s} isOn={pinStates['D13']?.value === 'high'} />;
        if (f.type === 'button') return <ButtonComponent key={f.id} feature={f} scale={s} />;
        if (f.type === 'crystal') return <CrystalOscillator key={f.id} feature={f} scale={s} />;
        if (f.type === 'regulator') return <VoltageRegulator key={f.id} feature={f} scale={s} />;
        return null;
      })}

      {/* Board label */}
      <text x={bw / 2} y={bh - 16} textAnchor="middle" fill="#e0f2f1" fontSize={10} fontWeight="bold" fontFamily="sans-serif">
        ARDUINO UNO R3
      </text>
      <text x={bw / 2} y={bh - 6} textAnchor="middle" fill="#80cbc4" fontSize={6} fontFamily="monospace">
        ATmega328P | 5V | 16MHz
      </text>

      {/* Digital header label */}
      <text x={12 * s} y={0.8 * s} textAnchor="middle" fill="#b2ebf2" fontSize={5} fontFamily="monospace">
        DIGITAL (PWM~)
      </text>
      {/* Analog header label */}
      <text x={15 * s} y={19.3 * s} textAnchor="middle" fill="#b2ebf2" fontSize={5} fontFamily="monospace">
        ANALOG IN
      </text>
      {/* Power header label */}
      <text x={1.5 * s} y={4.5 * s} textAnchor="middle" fill="#b2ebf2" fontSize={4} fontFamily="monospace" transform={`rotate(-90, ${1.5 * s}, ${4.5 * s})`}>
        POWER
      </text>

      {/* All pins */}
      <BoardPins pins={board.pins} pinStates={pinStates} selectedPinId={selectedPinId} onPinClick={onPinClick} onPinHover={onPinHover} onPinLeave={onPinLeave} />
    </g>
  );
}

// ========================== ARDUINO NANO ==========================

export function ArduinoNanoSVG(props: BoardSVGProps) {
  const {
    pinStates = {},
    selectedPinId,
    onPinClick,
    onPinHover,
    onPinLeave,
    scale: propScale,
  } = props;
  const s = propScale || U;
  const board = getBoardPinout('arduino-nano');
  if (!board) return null;

  const bw = board.boardWidth * s;
  const bh = board.boardHeight * s;

  return (
    <g data-component-id="board-arduino-nano">
      <BoardDefs boardId="arduino-nano" />

      {/* Board body with shadow */}
      <rect
        x={0} y={0} width={bw} height={bh}
        rx={4}
        fill={`url(#board-grad-arduino-nano)`}
        stroke="#005A6E"
        strokeWidth={1.2}
        filter="url(#board-shadow-arduino-nano)"
      />

      {/* PCB texture */}
      <g opacity={0.06}>
        {Array.from({ length: 30 }, (_, i) => (
          <line key={`ntrace-h-${i}`} x1={0} y1={i * 5.5} x2={bw} y2={i * 5.5} stroke="#fff" strokeWidth={0.3} />
        ))}
      </g>

      {/* Pin header strips */}
      {board.pinGroups.map((group) => (
        <PinHeader key={group.id} group={group} pins={group.pinIds.map((id) => board.pins.find((p) => p.id === id)!).filter(Boolean)} s={s} />
      ))}

      {/* Features */}
      {board.features.map((f) => {
        if (f.type === 'usb') return <USBConnector key={f.id} feature={f} scale={s} />;
        if (f.type === 'chip') return <MCUChip key={f.id} feature={f} scale={s} />;
        if (f.type === 'led') return <LEDComponent key={f.id} feature={f} scale={s} isOn={pinStates['D13_N']?.value === 'high'} />;
        if (f.type === 'button') return <ButtonComponent key={f.id} feature={f} scale={s} />;
        if (f.type === 'crystal') return <CrystalOscillator key={f.id} feature={f} scale={s} />;
        return null;
      })}

      {/* Board label */}
      <text x={bw / 2} y={bh - 8} textAnchor="middle" fill="#e0f2f1" fontSize={8} fontWeight="bold" fontFamily="sans-serif">
        ARDUINO NANO
      </text>
      <text x={bw / 2} y={bh - 1} textAnchor="middle" fill="#80cbc4" fontSize={5} fontFamily="monospace">
        ATmega328P | 5V
      </text>

      {/* Pin labels */}
      <text x={0.5 * s} y={bh - 18} textAnchor="middle" fill="#b2ebf2" fontSize={4} fontFamily="monospace" transform={`rotate(-90, ${0.5 * s}, ${bh / 2})`}>
        LEFT PINS
      </text>
      <text x={16.5 * s} y={bh - 18} textAnchor="middle" fill="#b2ebf2" fontSize={4} fontFamily="monospace" transform={`rotate(90, ${16.5 * s}, ${bh / 2})`}>
        RIGHT PINS
      </text>

      {/* All pins */}
      <BoardPins pins={board.pins} pinStates={pinStates} selectedPinId={selectedPinId} onPinClick={onPinClick} onPinHover={onPinHover} onPinLeave={onPinLeave} />
    </g>
  );
}

// ========================== ESP32 DevKit V1 ==========================

export function ESP32DevKitSVG(props: BoardSVGProps) {
  const {
    pinStates = {},
    selectedPinId,
    onPinClick,
    onPinHover,
    onPinLeave,
    scale: propScale,
  } = props;
  const s = propScale || U;
  const board = getBoardPinout('esp32-devkit');
  if (!board) return null;

  const bw = board.boardWidth * s;
  const bh = board.boardHeight * s;

  return (
    <g data-component-id="board-esp32-devkit">
      <BoardDefs boardId="esp32-devkit" />

      {/* Board body with shadow */}
      <rect
        x={0} y={0} width={bw} height={bh}
        rx={4}
        fill={`url(#board-grad-esp32-devkit)`}
        stroke="#2a2a4a"
        strokeWidth={1.2}
        filter="url(#board-shadow-esp32-devkit)"
      />

      {/* PCB texture */}
      <g opacity={0.04}>
        {Array.from({ length: 30 }, (_, i) => (
          <line key={`etrace-h-${i}`} x1={0} y1={i * 5.5} x2={bw} y2={i * 5.5} stroke="#fff" strokeWidth={0.3} />
        ))}
      </g>

      {/* ESP-WROOM-32 module area */}
      <rect
        x={7 * s} y={5 * s} width={7 * s} height={8 * s}
        rx={2}
        fill="#0a0a1e"
        stroke="#2a2a4a"
        strokeWidth={1}
      />
      {/* Module metal shield */}
      <rect
        x={7.3 * s} y={5.3 * s} width={6.4 * s} height={7.4 * s}
        rx={1}
        fill="#2a2a3e"
        stroke="#3a3a5a"
        strokeWidth={0.5}
      />
      {/* Antenna area on module */}
      <rect
        x={7.3 * s} y={5.3 * s} width={6.4 * s} height={2.5 * s}
        rx={1}
        fill="#1a1a2e"
        stroke="#3a3a5a"
        strokeWidth={0.5}
      />
      {/* Antenna trace pattern */}
      <g opacity={0.3}>
        <path d={`M${8 * s},${6 * s} L${13 * s},${6 * s} L${13 * s},${7.5 * s} L${8 * s},${7.5 * s} Z`} fill="none" stroke="#5a5a8a" strokeWidth={0.4} />
        <line x1={9 * s} y1={6.5 * s} x2={12 * s} y2={6.5 * s} stroke="#5a5a8a" strokeWidth={0.3} />
        <line x1={9 * s} y1={7 * s} x2={12 * s} y2={7 * s} stroke="#5a5a8a" strokeWidth={0.3} />
      </g>
      {/* Module label */}
      <text x={10.5 * s} y={12 * s} textAnchor="middle" fill="#6a6a9a" fontSize={5} fontWeight="bold" fontFamily="monospace">
        ESP-WROOM-32
      </text>

      {/* Pin header strips */}
      {board.pinGroups.map((group) => (
        <PinHeader key={group.id} group={group} pins={group.pinIds.map((id) => board.pins.find((p) => p.id === id)!).filter(Boolean)} s={s} />
      ))}

      {/* Features */}
      {board.features.map((f) => {
        if (f.type === 'usb') return <USBConnector key={f.id} feature={f} scale={s} />;
        if (f.type === 'button') return <ButtonComponent key={f.id} feature={f} scale={s} />;
        if (f.type === 'led') return <LEDComponent key={f.id} feature={f} scale={s} isOn={pinStates['D2']?.value === 'high'} />;
        if (f.type === 'regulator') return <VoltageRegulator key={f.id} feature={f} scale={s} />;
        if (f.type === 'antenna') return null; // Antenna rendered inline above
        if (f.type === 'chip') return null; // ESP-WROOM-32 rendered inline above
        return null;
      })}

      {/* Board label */}
      <text x={bw / 2} y={bh - 8} textAnchor="middle" fill="#8a8aaa" fontSize={8} fontWeight="bold" fontFamily="sans-serif">
        ESP32 DevKit V1
      </text>
      <text x={bw / 2} y={bh - 1} textAnchor="middle" fill="#6a6a8a" fontSize={5} fontFamily="monospace">
        Xtensa Dual-Core | 3.3V | WiFi+BLE
      </text>

      {/* GPIO labels */}
      <text x={0.5 * s} y={0.7 * s} textAnchor="middle" fill="#7a7aaa" fontSize={4} fontFamily="monospace" transform={`rotate(-90, ${0.5 * s}, ${bh / 2})`}>
        GPIO LEFT
      </text>
      <text x={20.5 * s} y={0.7 * s} textAnchor="middle" fill="#7a7aaa" fontSize={4} fontFamily="monospace" transform={`rotate(90, ${20.5 * s}, ${bh / 2})`}>
        GPIO RIGHT
      </text>

      {/* All pins */}
      <BoardPins pins={board.pins} pinStates={pinStates} selectedPinId={selectedPinId} onPinClick={onPinClick} onPinHover={onPinHover} onPinLeave={onPinLeave} />
    </g>
  );
}

// ========================== RASPBERRY PI PICO ==========================

export function RaspberryPiPicoSVG(props: BoardSVGProps) {
  const {
    pinStates = {},
    selectedPinId,
    onPinClick,
    onPinHover,
    onPinLeave,
    scale: propScale,
  } = props;
  const s = propScale || U;
  const board = getBoardPinout('raspberry-pi-pico');
  if (!board) return null;

  const bw = board.boardWidth * s;
  const bh = board.boardHeight * s;

  return (
    <g data-component-id="board-raspberry-pi-pico">
      <BoardDefs boardId="raspberry-pi-pico" />

      {/* Board body with shadow */}
      <rect
        x={0} y={0} width={bw} height={bh}
        rx={3}
        fill={`url(#board-grad-raspberry-pi-pico)`}
        stroke="#4a4a4a"
        strokeWidth={1}
        filter="url(#board-shadow-raspberry-pi-pico)"
      />

      {/* Rounded notch at top (USB side) */}
      <rect
        x={7 * s} y={0} width={3 * s} height={2 * s}
        rx={2}
        fill={`url(#board-grad-raspberry-pi-pico)`}
      />

      {/* PCB texture */}
      <g opacity={0.05}>
        {Array.from({ length: 40 }, (_, i) => (
          <line key={`ptrace-h-${i}`} x1={0} y1={i * 5} x2={bw} y2={i * 5} stroke="#fff" strokeWidth={0.3} />
        ))}
      </g>

      {/* RP2040 chip area */}
      <rect
        x={7 * s} y={7 * s} width={5 * s} height={6 * s}
        rx={1}
        fill="#1a1a1a"
        stroke="#333"
        strokeWidth={0.8}
      />
      {/* Chip detail */}
      <rect
        x={7.3 * s} y={7.3 * s} width={4.4 * s} height={5.4 * s}
        rx={0.5}
        fill="#222"
        stroke="#444"
        strokeWidth={0.4}
      />
      {/* Pin 1 dot */}
      <circle cx={8.2 * s} cy={8.2 * s} r={1.5} fill="#555" />
      {/* Chip label */}
      <text x={9.5 * s} y={10.5 * s} textAnchor="middle" fill="#777" fontSize={6} fontWeight="bold" fontFamily="monospace">
        RP2040
      </text>
      {/* Chip pads around */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={`rp2040-top-${i}`} x={(8 + i * 0.5) * s} y={7 * s} width={3} height={3} rx={0.3} fill="#a0a0a8" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={`rp2040-bot-${i}`} x={(8 + i * 0.5) * s} y={(12.5) * s - 3} width={3} height={3} rx={0.3} fill="#a0a0a8" />
      ))}

      {/* Pin header strips */}
      {board.pinGroups.map((group) => (
        <PinHeader key={group.id} group={group} pins={group.pinIds.map((id) => board.pins.find((p) => p.id === id)!).filter(Boolean)} s={s} />
      ))}

      {/* Features */}
      {board.features.map((f) => {
        if (f.type === 'usb') return <USBConnector key={f.id} feature={f} scale={s} />;
        if (f.type === 'button') return <ButtonComponent key={f.id} feature={f} scale={s} />;
        if (f.type === 'led') return <LEDComponent key={f.id} feature={f} scale={s} isOn={pinStates['GP25']?.value === 'high'} />;
        if (f.type === 'regulator') return <VoltageRegulator key={f.id} feature={f} scale={s} />;
        if (f.type === 'crystal') return <CrystalOscillator key={f.id} feature={f} scale={s} />;
        if (f.type === 'chip') return null; // RP2040 rendered inline above
        return null;
      })}

      {/* BOOTSEL button area (white rounded rectangle) */}
      <rect x={5 * s} y={0.5 * s} width={1.5 * s} height={1.2 * s} rx={2} fill="#e8e8e8" stroke="#ccc" strokeWidth={0.5} />
      <text x={5.75 * s} y={1.4 * s} textAnchor="middle" fill="#333" fontSize={3} fontWeight="bold" fontFamily="monospace">
        BOOT
      </text>

      {/* Board label */}
      <text x={bw / 2} y={bh - 12} textAnchor="middle" fill="#d0d0d0" fontSize={8} fontWeight="bold" fontFamily="sans-serif">
        Raspberry Pi Pico
      </text>
      <text x={bw / 2} y={bh - 4} textAnchor="middle" fill="#888" fontSize={5} fontFamily="monospace">
        RP2040 | 3.3V | 133MHz
      </text>

      {/* Pin side labels */}
      <text x={0.5 * s} y={bh / 2} textAnchor="middle" fill="#888" fontSize={4} fontFamily="monospace" transform={`rotate(-90, ${0.5 * s}, ${bh / 2})`}>
        GP0-GP15 + GND
      </text>
      <text x={19.5 * s} y={bh / 2} textAnchor="middle" fill="#888" fontSize={4} fontFamily="monospace" transform={`rotate(90, ${19.5 * s}, ${bh / 2})`}>
        GP16-GP28 + ADC + PWR
      </text>

      {/* All pins */}
      <BoardPins pins={board.pins} pinStates={pinStates} selectedPinId={selectedPinId} onPinClick={onPinClick} onPinHover={onPinHover} onPinLeave={onPinLeave} />
    </g>
  );
}

// ========================== STM32 NUCLEO-F411RE ==========================

export function STM32NucleoSVG(props: BoardSVGProps) {
  const {
    pinStates = {},
    selectedPinId,
    onPinClick,
    onPinHover,
    onPinLeave,
    scale: propScale,
  } = props;
  const s = propScale || U;
  const board = getBoardPinout('stm32-nucleo-f411re');
  if (!board) return null;

  const bw = board.boardWidth * s;
  const bh = board.boardHeight * s;

  return (
    <g data-component-id="board-stm32-nucleo-f411re">
      <BoardDefs boardId="stm32-nucleo-f411re" />

      {/* Board body with shadow */}
      <rect
        x={0} y={0} width={bw} height={bh}
        rx={4}
        fill={`url(#board-grad-stm32-nucleo-f411re)`}
        stroke="#2D1B4E"
        strokeWidth={1.2}
        filter="url(#board-shadow-stm32-nucleo-f411re)"
      />

      {/* PCB texture */}
      <g opacity={0.05}>
        {Array.from({ length: 55 }, (_, i) => (
          <line key={`strace-h-${i}`} x1={0} y1={i * 5} x2={bw} y2={i * 5} stroke="#fff" strokeWidth={0.3} />
        ))}
      </g>

      {/* ST-Link section (top portion, slightly different color) */}
      <rect
        x={0} y={0} width={bw} height={5 * s}
        rx={4}
        fill="#3a1870"
        opacity={0.5}
      />
      {/* ST-Link snap-off line */}
      <line x1={0} y1={5 * s} x2={bw} y2={5 * s} stroke="#5a2a8a" strokeWidth={1} strokeDasharray="4,3" />
      <text x={bw / 2} y={3.5 * s} textAnchor="middle" fill="#9a7ac0" fontSize={5} fontFamily="monospace">
        ST-Link V2-1 (SNAP-OFF)
      </text>

      {/* STM32F411RE chip area */}
      <rect
        x={10 * s} y={12 * s} width={5 * s} height={5 * s}
        rx={1}
        fill="#1a1a2a"
        stroke="#3a3a5a"
        strokeWidth={0.8}
      />
      {/* LQFP64 chip detail */}
      <rect
        x={10.3 * s} y={12.3 * s} width={4.4 * s} height={4.4 * s}
        rx={0.5}
        fill="#222238"
        stroke="#3a3a5a"
        strokeWidth={0.4}
      />
      {/* Pin 1 dot */}
      <circle cx={11 * s} cy={13 * s} r={1.5} fill="#4a4a6a" />
      {/* Chip label */}
      <text x={12.5 * s} y={15 * s} textAnchor="middle" fill="#6a6a8a" fontSize={5} fontWeight="bold" fontFamily="monospace">
        STM32
      </text>
      <text x={12.5 * s} y={16 * s} textAnchor="middle" fill="#5a5a7a" fontSize={4} fontFamily="monospace">
        F411RE
      </text>
      {/* QFP pads */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={`stm32-top-${i}`} x={(10.5 + i * 0.42) * s} y={12 * s} width={2.5} height={2.5} rx={0.2} fill="#a0a0a8" />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={`stm32-bot-${i}`} x={(10.5 + i * 0.42) * s} y={(16.5) * s - 2.5} width={2.5} height={2.5} rx={0.2} fill="#a0a0a8" />
      ))}

      {/* Morpho header area (subtle background) */}
      <rect x={0} y={11 * s} width={2 * s} height={17 * s} rx={1} fill="#2a1050" opacity={0.4} />
      <rect x={24 * s} y={3 * s} width={2 * s} height={25 * s} rx={1} fill="#2a1050" opacity={0.4} />

      {/* Pin header strips */}
      {board.pinGroups.map((group) => (
        <PinHeader key={group.id} group={group} pins={group.pinIds.map((id) => board.pins.find((p) => p.id === id)!).filter(Boolean)} s={s} />
      ))}

      {/* Features */}
      {board.features.map((f) => {
        if (f.type === 'usb') return <USBConnector key={f.id} feature={f} scale={s} />;
        if (f.type === 'chip' && f.id === 'stlink') {
          // ST-Link area rendered inline above
          return null;
        }
        if (f.type === 'chip' && f.id === 'stm32-mcu') {
          // MCU rendered inline above
          return null;
        }
        if (f.type === 'led') {
          const isOn = f.id === 'led-builtin-stm32' ? pinStates['D13_S']?.value === 'high' : false;
          return <LEDComponent key={f.id} feature={f} scale={s} isOn={isOn} />;
        }
        if (f.type === 'button') return <ButtonComponent key={f.id} feature={f} scale={s} />;
        if (f.type === 'jumper') {
          const jx = f.x * s;
          const jy = f.y * s;
          const jw = (f.width || 1.5) * s;
          const jh = (f.height || 0.8) * s;
          return (
            <g key={f.id}>
              <rect x={jx} y={jy} width={jw} height={jh} rx={1} fill={f.color || '#f59e0b'} stroke="#d97706" strokeWidth={0.5} />
              <circle cx={jx + 3} cy={jy + jh / 2} r={1.5} fill="#92400e" />
              {f.label && (
                <text x={jx + jw + 3} y={jy + jh / 2 + 2} fill="#9a7ac0" fontSize={3} fontFamily="monospace">{f.label}</text>
              )}
            </g>
          );
        }
        if (f.type === 'crystal') return <CrystalOscillator key={f.id} feature={f} scale={s} />;
        if (f.type === 'regulator') return <VoltageRegulator key={f.id} feature={f} scale={s} />;
        return null;
      })}

      {/* Board label */}
      <text x={bw / 2} y={bh - 12} textAnchor="middle" fill="#d0c0e8" fontSize={8} fontWeight="bold" fontFamily="sans-serif">
        STM32 Nucleo-F411RE
      </text>
      <text x={bw / 2} y={bh - 4} textAnchor="middle" fill="#8a7aaa" fontSize={5} fontFamily="monospace">
        ARM Cortex-M4F | 100MHz | 3.3V
      </text>

      {/* Arduino compatible label */}
      <text x={14 * s} y={2.5 * s} textAnchor="middle" fill="#c0a0e0" fontSize={5} fontFamily="monospace">
        ARDUINO COMPATIBLE
      </text>

      {/* All pins */}
      <BoardPins pins={board.pins} pinStates={pinStates} selectedPinId={selectedPinId} onPinClick={onPinClick} onPinHover={onPinHover} onPinLeave={onPinLeave} />
    </g>
  );
}

// ========================== BOARD SELECTOR ==========================

export function BoardSVGSelector({
  boardId,
  ...props
}: {
  boardId: string;
} & BoardSVGProps): JSX.Element {
  switch (boardId) {
    case 'arduino-uno':
      return <ArduinoUnoSVG {...props} />;
    case 'arduino-nano':
      return <ArduinoNanoSVG {...props} />;
    case 'esp32-devkit':
      return <ESP32DevKitSVG {...props} />;
    case 'raspberry-pi-pico':
    case 'raspberry-pi-pico-w':
      return <RaspberryPiPicoSVG {...props} />;
    case 'stm32-nucleo-f411re':
    case 'stm32-nucleo-f103rb':
      return <STM32NucleoSVG {...props} />;
    default:
      return <GenericBoardSVG boardId={boardId} {...props} />;
  }
}

// ========================== GENERIC FALLBACK ==========================

function GenericBoardSVG({ boardId, ...props }: { boardId: string } & BoardSVGProps) {
  const board = getBoardPinout(boardId);
  const {
    pinStates = {},
    selectedPinId,
    onPinClick,
    onPinHover,
    onPinLeave,
    scale: propScale,
  } = props;
  const s = propScale || U;

  if (board) {
    const bw = board.boardWidth * s;
    const bh = board.boardHeight * s;
    return (
      <g data-component-id={`board-${boardId}`}>
        <rect
          x={0} y={0} width={bw} height={bh}
          rx={4}
          fill="#1e293b"
          stroke="#334155"
          strokeWidth={1.5}
        />
        <text x={bw / 2} y={bh / 2 - 4} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight="bold" fontFamily="sans-serif">
          {board.boardName}
        </text>
        <text x={bw / 2} y={bh / 2 + 6} textAnchor="middle" fill="#64748b" fontSize={5} fontFamily="monospace">
          {board.pins.length} pins
        </text>
        <BoardPins pins={board.pins} pinStates={pinStates} selectedPinId={selectedPinId} onPinClick={onPinClick} onPinHover={onPinHover} onPinLeave={onPinLeave} />
      </g>
    );
  }

  // No pinout data — render a simple placeholder
  return (
    <g data-component-id={`board-${boardId}`}>
      <rect x={-50} y={-35} width={100} height={70} rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
      <text x={0} y={-4} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight="bold" fontFamily="sans-serif">
        {boardId}
      </text>
      <text x={0} y={8} textAnchor="middle" fill="#64748b" fontSize={5} fontFamily="monospace">
        No pinout data
      </text>
    </g>
  );
}
