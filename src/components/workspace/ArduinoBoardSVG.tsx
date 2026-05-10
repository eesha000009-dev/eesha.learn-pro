'use client';

import React from 'react';

interface ArduinoBoardSVGProps {
  x: number;
  y: number;
  ledOn?: boolean;
  powerLed?: boolean;
  onPinClick?: (pinId: string, absX: number, absY: number) => void;
  selected?: boolean;
}

export function ArduinoBoardSVG({ x, y, ledOn = false, powerLed = true, onPinClick, selected }: ArduinoBoardSVGProps) {
  const handleClick = (pinId: string, absX: number, absY: number) => {
    onPinClick?.(pinId, absX, absY);
  };

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Board outline / PCB */}
      <rect
        x="-5" y="-5"
        width="290" height="310"
        rx="8" ry="8"
        fill="#0078AA"
        stroke="#005f88"
        strokeWidth="2"
        className={selected ? 'stroke-emerald-400' : ''}
      />

      {/* PCB edge / FR4 */}
      <rect x="0" y="0" width="280" height="300" rx="5" ry="5" fill="#0078AA" />

      {/* Mounting holes */}
      <circle cx="15" cy="15" r="4" fill="#222" stroke="#444" strokeWidth="1" />
      <circle cx="265" cy="15" r="4" fill="#222" stroke="#444" strokeWidth="1" />
      <circle cx="15" cy="285" r="4" fill="#222" stroke="#444" strokeWidth="1" />
      <circle cx="265" cy="285" r="4" fill="#222" stroke="#444" strokeWidth="1" />

      {/* USB-B connector */}
      <rect x="-20" y="20" width="30" height="55" rx="3" fill="#aaa" stroke="#888" strokeWidth="1.5" />
      <rect x="-15" y="28" width="20" height="40" rx="2" fill="#777" />
      <text x="-5" y="52" textAnchor="middle" fill="#555" fontSize="7" fontFamily="monospace">USB</text>

      {/* Power jack */}
      <rect x="-15" y="90" width="25" height="40" rx="3" fill="#333" stroke="#555" strokeWidth="1" />
      <circle cx="-2" cy="110" r="6" fill="#222" stroke="#444" strokeWidth="1" />

      {/* Reset button */}
      <rect x="50" y="135" width="18" height="12" rx="2" fill="#c44" stroke="#933" strokeWidth="1" />
      <rect x="53" y="137" width="12" height="8" rx="1" fill="#e55" />

      {/* ATmega328P chip */}
      <rect x="80" y="100" width="65" height="75" rx="2" fill="#333" stroke="#555" strokeWidth="1" />
      <circle cx="88" cy="110" r="3" fill="#555" />
      {/* Chip pins (left) */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={`cl-${i}`} x={75} y={107 + i * 8} width={5} height={2} fill="#aaa" />
      ))}
      {/* Chip pins (right) */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={`cr-${i}`} x={145} y={107 + i * 8} width={5} height={2} fill="#aaa" />
      ))}
      {/* Chip pins (top) */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`ct-${i}`} x={90 + i * 10} y={95} width={2} height={5} fill="#aaa" />
      ))}
      {/* Chip pins (bottom) */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`cb-${i}`} x={90 + i * 10} y={175} width={2} height={5} fill="#aaa" />
      ))}
      <text x="112" y="142" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">ATmega</text>
      <text x="112" y="150" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">328P</text>

      {/* Crystal oscillator */}
      <rect x="160" y="120" width="16" height="8" rx="2" fill="#c0c0c0" stroke="#999" strokeWidth="0.5" />

      {/* ICSP header */}
      <rect x="155" y="50" width="25" height="20" rx="1" fill="#222" stroke="#555" strokeWidth="1" />
      {[0, 1, 2].map((i) => (
        <circle key={`icsp-${i}`} cx={162 + i * 7} cy={57} r="2" fill="#daa520" />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={`icsp2-${i}`} cx={162 + i * 7} cy={64} r="2" fill="#daa520" />
      ))}
      <text x="167" y="47" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">ICSP</text>

      {/* LEDs */}
      {/* Power LED */}
      <circle cx="60" cy="160" r="3" fill={powerLed ? '#22c55e' : '#166534'} className={powerLed ? 'animate-pulse' : ''} />
      <text x="70" y="163" fill="#ccc" fontSize="5" fontFamily="monospace">PWR</text>

      {/* TX LED */}
      <circle cx="60" cy="175" r="3" fill="#444" />
      <text x="70" y="178" fill="#ccc" fontSize="5" fontFamily="monospace">TX</text>

      {/* RX LED */}
      <circle cx="60" cy="190" r="3" fill="#444" />
      <text x="70" y="193" fill="#ccc" fontSize="5" fontFamily="monospace">RX</text>

      {/* Built-in LED (D13) */}
      <circle cx="60" cy="205" r="3" fill={ledOn ? '#ef4444' : '#7f1d1d'} />
      <text x="70" y="208" fill="#ccc" fontSize="5" fontFamily="monospace">L</text>

      {/* Arduino text */}
      <text x="180" y="200" textAnchor="middle" fill="white" fontSize="14" fontFamily="Arial, sans-serif" fontWeight="bold" opacity="0.8">ARDUINO</text>
      <text x="180" y="218" textAnchor="middle" fill="white" fontSize="11" fontFamily="Arial, sans-serif" fontWeight="bold" opacity="0.6">UNO R3</text>

      {/* ─── LEFT PINS (Power + Analog) ─────────────────────── */}
      {/* Power header */}
      <text x="-12" y="23" textAnchor="middle" fill="#ccc" fontSize="6" fontFamily="monospace" fontWeight="bold">5V</text>
      <circle cx="0" cy="20" r="4" fill="#ef4444" stroke="#fff" strokeWidth="1" opacity="0.9"
        className="cursor-pointer hover:opacity-100 hover:scale-110 transition-transform"
        onClick={() => handleClick('5v', x, y + 20)} />

      <text x="-12" y="43" textAnchor="middle" fill="#ccc" fontSize="6" fontFamily="monospace" fontWeight="bold">3V</text>
      <circle cx="0" cy="40" r="4" fill="#f97316" stroke="#fff" strokeWidth="1" opacity="0.9"
        className="cursor-pointer hover:opacity-100"
        onClick={() => handleClick('3v3', x, y + 40)} />

      <text x="-12" y="63" textAnchor="middle" fill="#ccc" fontSize="6" fontFamily="monospace" fontWeight="bold">RST</text>
      <circle cx="0" cy="60" r="4" fill="#a855f7" stroke="#fff" strokeWidth="1" opacity="0.9"
        className="cursor-pointer hover:opacity-100"
        onClick={() => handleClick('rst', x, y + 60)} />

      <text x="-12" y="83" textAnchor="middle" fill="#ccc" fontSize="6" fontFamily="monospace">GND</text>
      <circle cx="0" cy="80" r="4" fill="#27272a" stroke="#fff" strokeWidth="1" opacity="0.9"
        className="cursor-pointer hover:opacity-100"
        onClick={() => handleClick('gnd1', x, y + 80)} />

      <text x="-12" y="103" textAnchor="middle" fill="#ccc" fontSize="6" fontFamily="monospace">GND</text>
      <circle cx="0" cy="100" r="4" fill="#27272a" stroke="#fff" strokeWidth="1" opacity="0.9"
        className="cursor-pointer hover:opacity-100"
        onClick={() => handleClick('gnd2', x, y + 100)} />

      <text x="-12" y="123" textAnchor="middle" fill="#ccc" fontSize="6" fontFamily="monospace" fontWeight="bold">VIN</text>
      <circle cx="0" cy="120" r="4" fill="#ef4444" stroke="#fff" strokeWidth="1" opacity="0.9"
        className="cursor-pointer hover:opacity-100"
        onClick={() => handleClick('vin', x, y + 120)} />

      {/* Analog header */}
      {['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((label, i) => (
        <g key={label}>
          <text x="-14" y={153 + i * 20} textAnchor="middle" fill="#22d3ee" fontSize="6" fontFamily="monospace" fontWeight="bold">{label}</text>
          <circle cx={0} cy={150 + i * 20} r="4" fill="#0ea5e9" stroke="#fff" strokeWidth="1" opacity="0.9"
            className="cursor-pointer hover:opacity-100"
            onClick={() => handleClick(`a${i}`, x, y + 150 + i * 20)} />
        </g>
      ))}

      {/* ─── RIGHT PINS (Digital) ─────────────────────────── */}
      {Array.from({ length: 14 }, (_, i) => {
        const label = i === 0 ? 'D0' : i === 1 ? 'D1' : `${i}`;
        const extra = i === 0 ? '/RX' : i === 1 ? '/TX' : [3, 5, 6, 9, 10, 11].includes(i) ? '~' : '';
        return (
          <g key={`d${i}`}>
            <text x={292} y={23 + i * 20} textAnchor="middle" fill="#a3e635" fontSize="6" fontFamily="monospace" fontWeight="bold">{label}</text>
            {extra && <text x={292} y={31 + i * 20} textAnchor="middle" fill="#65a30d" fontSize="5" fontFamily="monospace">{extra}</text>}
            <circle cx={280} cy={20 + i * 20} r="4" fill="#84cc16" stroke="#fff" strokeWidth="1" opacity="0.9"
              className="cursor-pointer hover:opacity-100"
              onClick={() => handleClick(`d${i}`, x + 280, y + 20 + i * 20)} />
          </g>
        );
      })}
    </g>
  );
}
