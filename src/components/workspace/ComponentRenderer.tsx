'use client';

import React from 'react';

interface ComponentRendererProps {
  comp: {
    id: string;
    defId: string;
    x: number;
    y: number;
    state?: Record<string, any>;
    pins: { id: string; label: string; offset: { x: number; y: number }; side: string; type: string; value: number }[];
  };
  onPinClick?: (pinId: string, absX: number, absY: number) => void;
  selected?: boolean;
}

export function ComponentRenderer({ comp, onPinClick, selected }: ComponentRendererProps) {
  const { x, y, defId, state, pins } = comp;

  const handlePinClick = (pinId: string, pinX: number, pinY: number) => {
    onPinClick?.(pinId, x + pinX, y + pinY);
  };

  const pinColor = (type: string) => {
    switch (type) {
      case 'power': return '#ef4444';
      case 'ground': return '#27272a';
      case 'analog': return '#0ea5e9';
      case 'digital': return '#84cc16';
      default: return '#71717a';
    }
  };

  const renderPins = () => pins.map((pin) => (
    <circle
      key={pin.id}
      cx={pin.offset.x}
      cy={pin.offset.y}
      r="4"
      fill={pinColor(pin.type)}
      stroke={selected ? '#10b981' : '#fff'}
      strokeWidth={selected ? 2 : 1}
      opacity={0.9}
      className="cursor-pointer hover:opacity-100 hover:r-[5px] transition-all"
      onClick={(e) => {
        e.stopPropagation();
        handlePinClick(pin.id, pin.offset.x, pin.offset.y);
      }}
    />
  ));

  const renderPinLabels = () => pins.map((pin) => {
    let lx = pin.offset.x;
    let ly = pin.offset.y;
    const anchor: React.SVGTextAttributes['textAnchor'] = 'middle';
    switch (pin.side) {
      case 'top': ly -= 10; break;
      case 'bottom': ly += 14; break;
      case 'left': lx -= 10; break;
      case 'right': lx += 10; break;
    }
    return (
      <text key={pin.id} x={lx} y={ly} textAnchor={anchor} fill="#aaa" fontSize="5" fontFamily="monospace">
        {pin.label}
      </text>
    );
  });

  switch (defId) {
    // ─── LED ──────────────────────────────────────────────────
    case 'led-red':
    case 'led-green':
    case 'led-blue':
    case 'led-yellow': {
      const colors: Record<string, string> = {
        'led-red': '#ef4444', 'led-green': '#22c55e', 'led-blue': '#3b82f6', 'led-yellow': '#eab308',
      };
      const isOn = state?.ledOn || (pins[0]?.value > 2.5);
      return (
        <g transform={`translate(${x}, ${y})`}>
          <ellipse cx="20" cy="15" rx="10" ry="8" fill={isOn ? colors[defId] : `${colors[defId]}33`} stroke={colors[defId]} strokeWidth="1" />
          {isOn && (
            <ellipse cx="20" cy="15" rx="14" ry="12" fill="none" stroke={colors[defId]} strokeWidth="0.5" opacity="0.3" />
          )}
          <line x1="10" y1="15" x2="0" y2="15" stroke="#aaa" strokeWidth="1.5" />
          <line x1="30" y1="15" x2="40" y2="15" stroke="#aaa" strokeWidth="1.5" />
          <text x="20" y="18" textAnchor="middle" fill="#fff" fontSize="6" fontFamily="monospace">LED</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── RGB LED ─────────────────────────────────────────────
    case 'rgb-led': {
      const r = state?.r ?? (pins[0]?.value > 2.5 ? 1 : 0);
      const g = state?.g ?? (pins[2]?.value > 2.5 ? 1 : 0);
      const b = state?.b ?? (pins[3]?.value > 2.5 ? 1 : 0);
      const isOn = r || g || b;
      return (
        <g transform={`translate(${x}, ${y})`}>
          <ellipse cx="40" cy="15" rx="12" ry="10" fill={isOn ? `rgb(${r * 255}, ${g * 255}, ${b * 255})` : '#33333333'} stroke="#888" strokeWidth="1" />
          {isOn && (
            <ellipse cx="40" cy="15" rx="16" ry="14" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" />
          )}
          <line x1="10" y1="10" x2="28" y2="15" stroke="#ef4444" strokeWidth="1" />
          <line x1="35" y1="10" x2="35" y2="0" stroke="#aaa" strokeWidth="1" />
          <line x1="45" y1="10" x2="45" y2="0" stroke="#aaa" strokeWidth="1" />
          <line x1="52" y1="10" x2="70" y2="15" stroke="#3b82f6" strokeWidth="1" />
          <text x="40" y="18" textAnchor="middle" fill="#fff" fontSize="5" fontFamily="monospace">RGB</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── Resistor ────────────────────────────────────────────
    case 'resistor': {
      return (
        <g transform={`translate(${x}, ${y})`}>
          <line x1="0" y1="15" x2="15" y2="15" stroke="#aaa" strokeWidth="1.5" />
          <rect x="15" y="6" width="50" height="18" rx="3" fill="#d4a574" stroke="#b8956a" strokeWidth="0.5" />
          {/* Color bands: 220Ω = Red-Red-Brown-Gold */}
          <rect x="22" y="6" width="4" height="18" fill="#ef4444" />
          <rect x="30" y="6" width="4" height="18" fill="#ef4444" />
          <rect x="38" y="6" width="4" height="18" fill="#a16207" />
          <rect x="52" y="6" width="4" height="18" fill="#daa520" opacity="0.6" />
          <line x1="65" y1="15" x2="80" y2="15" stroke="#aaa" strokeWidth="1.5" />
          <text x="40" y="30" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">220Ω</text>
          {renderPins()}
        </g>
      );
    }

    // ─── Push Button ─────────────────────────────────────────
    case 'push-button': {
      return (
        <g transform={`translate(${x}, ${y})`}>
          <rect x="0" y="0" width="60" height="40" rx="2" fill="#333" stroke="#555" strokeWidth="1" />
          <rect x="18" y="12" width="24" height="16" rx="2" fill="#666" stroke="#888" strokeWidth="0.5" />
          <rect x="22" y="15" width="16" height="10" rx="1" fill="#999" />
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── Buzzer ──────────────────────────────────────────────
    case 'buzzer': {
      const isOn = state?.buzzerOn || (pins[0]?.value > 2.5);
      return (
        <g transform={`translate(${x}, ${y})`}>
          <circle cx="35" cy="20" r="16" fill="#222" stroke={isOn ? '#22c55e' : '#555'} strokeWidth="1.5" />
          <circle cx="35" cy="20" r="10" fill="#333" />
          <circle cx="35" cy="20" r="3" fill="#555" />
          <text x="35" y="23" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">♪</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── LCD 16x2 ───────────────────────────────────────────
    case 'lcd-16x2': {
      const line1 = state?.line1 || '';
      const line2 = state?.line2 || '';
      const backlight = state?.backlight !== false;
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* PCB */}
          <rect x="0" y="0" width="120" height="120" rx="3" fill="#1a6b3c" stroke="#0d5030" strokeWidth="1" />
          {/* LCD screen */}
          <rect x="15" y="10" width="90" height="60" rx="2" fill={backlight ? '#1a3a2a' : '#111'} stroke="#333" strokeWidth="1" />
          {/* Text line 1 */}
          <text x="20" y="32" fill="#22c55e" fontSize="10" fontFamily="monospace" letterSpacing="0.5">{line1 || '                '}</text>
          {/* Text line 2 */}
          <text x="20" y="56" fill="#22c55e" fontSize="10" fontFamily="monospace" letterSpacing="0.5">{line2 || '                '}</text>
          {/* I2C backpack */}
          <rect x="35" y="75" width="50" height="20" rx="1" fill="#1a237e" stroke="#0d1440" strokeWidth="0.5" />
          <text x="60" y="88" textAnchor="middle" fill="#888" fontSize="4" fontFamily="monospace">PCF8574</text>
          {/* Label */}
          <text x="60" y="110" textAnchor="middle" fill="#aaa" fontSize="6" fontFamily="monospace">LCD 16x2 I2C</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── Photoresistor (LDR) ─────────────────────────────────
    case 'photoresistor': {
      const val = state?.lightLevel ?? 512;
      const brightness = val / 1023;
      return (
        <g transform={`translate(${x}, ${y})`}>
          <circle cx="30" cy="15" r="10" fill={`rgba(139, 92, 42, ${0.3 + brightness * 0.5})`} stroke="#8b5c2a" strokeWidth="1" />
          <path d="M 22 8 L 25 12 L 22 16 L 25 20" stroke="#8b5c2a" strokeWidth="0.5" fill="none" />
          <path d="M 38 8 L 35 12 L 38 16 L 35 20" stroke="#8b5c2a" strokeWidth="0.5" fill="none" />
          <text x="30" y="18" textAnchor="middle" fill="#fff" fontSize="5" fontFamily="monospace">LDR</text>
          <text x="30" y="35" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">{val}</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── DHT22 ───────────────────────────────────────────────
    case 'dht22': {
      return (
        <g transform={`translate(${x}, ${y})`}>
          <rect x="0" y="0" width="80" height="40" rx="3" fill="#5dade2" stroke="#2e86c1" strokeWidth="1" />
          <rect x="5" y="5" width="25" height="30" rx="2" fill="rgba(255,255,255,0.15)" />
          <text x="17" y="20" textAnchor="middle" fill="white" fontSize="4" fontFamily="monospace">DHT</text>
          <text x="17" y="28" textAnchor="middle" fill="white" fontSize="6" fontFamily="monospace" fontWeight="bold">22</text>
          <text x="55" y="22" textAnchor="middle" fill="white" fontSize="5" fontFamily="monospace">
            {state?.temp !== undefined ? `${state.temp}°C` : '--'}
          </text>
          <text x="55" y="30" textAnchor="middle" fill="#ddd" fontSize="4" fontFamily="monospace">
            {state?.humidity !== undefined ? `${state.humidity}%` : '--'}
          </text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── Servo Motor ─────────────────────────────────────────
    case 'servo-motor': {
      const angle = state?.angle ?? 90;
      return (
        <g transform={`translate(${x}, ${y})`}>
          <rect x="10" y="5" width="60" height="35" rx="3" fill="#1565c0" stroke="#0d47a1" strokeWidth="1" />
          <circle cx="40" cy="22" r="10" fill="#e0e0e0" stroke="#bbb" strokeWidth="1" />
          <line x1="40" y1="22" x2={40 + Math.cos((angle * Math.PI) / 180) * 8} y2={22 - Math.sin((angle * Math.PI) / 180) * 8} stroke="#ef4444" strokeWidth="2" />
          <text x="40" y="48" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">{angle}°</text>
          <text x="40" y="56" textAnchor="middle" fill="#aaa" fontSize="5" fontFamily="monospace">SG90</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── Potentiometer ───────────────────────────────────────
    case 'potentiometer': {
      return (
        <g transform={`translate(${x}, ${y})`}>
          <rect x="25" y="5" width="40" height="20" rx="3" fill="#444" stroke="#666" strokeWidth="1" />
          <line x1="0" y1="15" x2="25" y2="15" stroke="#aaa" strokeWidth="1.5" />
          <line x1="65" y1="15" x2="90" y2="15" stroke="#aaa" strokeWidth="1.5" />
          <line x1="45" y1="25" x2="45" y2="30" stroke="#aaa" strokeWidth="1.5" />
          <circle cx="45" cy="15" r="5" fill="#333" stroke="#aaa" strokeWidth="0.5" />
          <line x1="45" y1="15" x2="49" y2="10" stroke="#fff" strokeWidth="1" />
          <text x="45" y="42" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">10kΩ</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ─── Ultrasonic HC-SR04 ──────────────────────────────────
    case 'ultrasonic-hc-sr04': {
      return (
        <g transform={`translate(${x}, ${y})`}>
          <rect x="0" y="0" width="140" height="40" rx="2" fill="#2e7d32" stroke="#1b5e20" strokeWidth="1" />
          {/* Ultrasonic eyes */}
          <circle cx="40" cy="20" r="10" fill="#c0c0c0" stroke="#999" strokeWidth="1" />
          <circle cx="40" cy="20" r="6" fill="#333" />
          <circle cx="100" cy="20" r="10" fill="#c0c0c0" stroke="#999" strokeWidth="1" />
          <circle cx="100" cy="20" r="6" fill="#333" />
          <text x="70" y="15" textAnchor="middle" fill="white" fontSize="5" fontFamily="monospace" fontWeight="bold">HC-SR04</text>
          <text x="70" y="36" textAnchor="middle" fill="#aaa" fontSize="4" fontFamily="monospace">
            {state?.distance !== undefined ? `${state.distance} cm` : '--'}
          </text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    default:
      return (
        <g transform={`translate(${x}, ${y})`}>
          <rect x="0" y="0" width="60" height="30" rx="3" fill="#444" stroke="#666" strokeWidth="1" />
          <text x="30" y="18" textAnchor="middle" fill="#ccc" fontSize="8" fontFamily="monospace">{defId}</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
  }
}
