// Based on wokwi-elements (MIT License) - Copyright (c) 2020 Uri Shaked
// https://github.com/wokwi/wokwi-elements

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
      className="cursor-pointer hover:opacity-100"
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
    // ═══ LED ═════════════════════════════════════════════════════════════
    case 'led-red':
    case 'led-green':
    case 'led-blue':
    case 'led-yellow': {
      const colors: Record<string, { body: string; glow: string }> = {
        'led-red': { body: '#ff0000', glow: '#ff8080' },
        'led-green': { body: '#00ff00', glow: '#80ff80' },
        'led-blue': { body: '#0000ff', glow: '#8080ff' },
        'led-yellow': { body: '#ffff00', glow: '#ffff80' },
      };
      const c = colors[defId];
      const isOn = state?.ledOn || (pins[0]?.value > 2.5);
      const brightness = isOn ? 1 : 0;
      const glowOpacity = brightness ? 0.3 + brightness * 0.7 : 0;
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* LED body - Wokwi-style dome shape */}
          <path
            d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
            opacity="0.3"
          />
          <path
            d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
            fill="#e6e6e6"
            opacity="0.5"
          />
          <path
            d="m14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v4.6296c1.4738 1.6517 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586l-4e-5 -1.5235c-7e-4 -1.1419-0.4744-2.2032-1.283-3.1054z"
            fill="#d1d1d1"
            opacity="0.9"
          />
          {/* Flat edge */}
          <polygon
            points="2.2032 16.107 3.1961 16.107 3.1961 13.095 6.0156 13.095 10.012 8.8049 3.407 8.8049 2.2032 9.648"
            fill="#666"
          />
          <polygon
            points="11.215 9.0338 7.4117 13.095 11.06 13.095 11.06 16.107 11.974 16.107 11.974 8.5241 10.778 8.5241"
            fill="#666"
          />
          {/* Color fill */}
          <path
            d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
            fill={c.body}
            opacity="0.65"
          />
          {/* Glow effect */}
          {isOn && (
            <g>
              <defs>
                <filter id={`ledGlow-${comp.id}`} x="-0.8" y="-0.8" height="2.2" width="2.8">
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>
              <ellipse cx="8" cy="10" rx="10" ry="10" fill={c.glow} filter={`url(#ledGlow-${comp.id})`} opacity={glowOpacity} />
              <ellipse cx="8" cy="10" rx="2" ry="2" fill="white" filter={`url(#ledGlow-${comp.id})`} />
            </g>
          )}
          {/* Leads */}
          <line x1="5" y1="20" x2="5" y2="30" stroke="#8c8c8c" strokeWidth="1.5" />
          <line x1="15" y1="20" x2="15" y2="30" stroke="#8c8c8c" strokeWidth="1.5" />
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ RGB LED ════════════════════════════════════════════════════════
    case 'rgb-led': {
      const r = state?.r ?? 0;
      const g = state?.g ?? 0;
      const b = state?.b ?? 0;
      const maxBrightness = Math.max(r, g, b);
      const glowOpacity = maxBrightness ? 0.2 + maxBrightness * 0.6 : 0;
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* LED body dome */}
          <path
            d="m8.3435 5.65v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
            fill="#e6e6e6"
            opacity="0.5"
          />
          <path
            d="m8.3435 5.65v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v4.6296c1.4738 1.6517 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586l-4e-5 -1.5235c-7e-4 -1.1419-0.4744-2.2032-1.283-3.1054z"
            fill="#d1d1d1"
            opacity="0.9"
          />
          <polygon
            points="2.2032 16.107 3.1961 16.107 3.1961 13.095 6.0156 13.095 10.012 8.8049 3.407 8.8049 2.2032 9.648"
            fill="#666"
          />
          <polygon
            points="11.215 9.0338 7.4117 13.095 11.06 13.095 11.06 16.107 11.974 16.107 11.974 8.5241 10.778 8.5241"
            fill="#666"
          />
          <path
            d="m8.3435 5.65v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
            fill="white"
            opacity="0.65"
          />
          {/* Glow */}
          <defs>
            <filter id={`rgbGlow-${comp.id}`} x="-0.8" y="-0.8" height="5.2" width="5.8">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          {maxBrightness > 0 && (
            <circle
              cx="1.7" cy="4" r="10"
              fill={`rgb(${Math.round(r * 255)}, ${Math.round(g * 255 + b * 90)}, ${Math.round(b * 255)})`}
              filter={`url(#rgbGlow-${comp.id})`}
              opacity={glowOpacity}
            />
          )}
          {/* Legs */}
          <path d="m4.1 15.334 3.0611 9.971" fill="none" stroke="#9D9999" strokeWidth="1.5" />
          <path d="m8 14.4 5.9987 4.0518 1.1777 6.5679" fill="none" stroke="#9D9999" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m-4.3 14.184-5.0755 5.6592-0.10206 6.1694" fill="none" stroke="#9D9999" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m-1.1 15.607-0.33725 18.4" fill="none" stroke="#9D9999" strokeWidth="1.5" />
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ Resistor ══════════════════════════════════════════════════════
    case 'resistor': {
      const resistance = state?.value ? parseInt(String(state.value)) : 220;
      const breakValue = (val: number) => {
        if (val === 0) return [0, 0];
        const exp = val >= 10000 ? 4 : val >= 1000 ? 3 : val >= 100 ? 2 : val >= 10 ? 1 : val >= 1 ? -1 : -2;
        const base = Math.round(val / Math.pow(10, exp));
        return [Math.round(base % 100), exp];
      };
      const [base, exponent] = breakValue(resistance);

      const bandColors: Record<number, string> = {
        [-2]: '#C3C7C0', [-1]: '#F1D863', 0: '#000000', 1: '#8F4814', 2: '#FB0000',
        3: '#FC9700', 4: '#FCF800', 5: '#00B800', 6: '#0000FF', 7: '#A803D6',
        8: '#808080', 9: '#FCFCFC',
      };

      const band1 = bandColors[Math.floor(base / 10)] || '#000';
      const band2 = bandColors[base % 10] || '#000';
      const band3 = bandColors[exponent] || '#000';

      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Lead wires */}
          <rect y="1.18" width="15.56" height="0.64" fill="#aaa" />
          {/* Axial body */}
          <path
            d="m4.6918 0c-1.0586 0-1.9185 0.67468-1.9185 1.5022 0 0.82756 0.85995 1.4978 1.9185 1.4978 0.4241 0 0.81356-0.11167 1.1312-0.29411h4.0949c0.31802 0.18313 0.71075 0.29411 1.1357 0.29411 1.0586 0 1.9185-0.67015 1.9185-1.4978 0-0.8276-0.85995-1.5022-1.9185-1.5022-0.42499 0-0.81773 0.11098-1.1357 0.29411h-4.0949c-0.31765-0.18244-0.7071-0.29411-1.1312-0.29411z"
            fill="#d5b597"
            strokeWidth="0.14479"
            stroke="#d5b597"
          />
          {/* Color bands */}
          <rect x="4" y="0" width="1" height="3" fill={band1} />
          <rect x="6" y="0.29" width="0.96" height="2.41" fill={band2} />
          <rect x="7.8" y="0.29" width="0.96" height="2.41" fill={band3} />
          <rect x="10.69" y="0" width="1" height="3" fill="#F1D863" />
          {/* Value label */}
          <text x="7.8" y="-0.5" textAnchor="middle" fill="#888" fontSize="1.2" fontFamily="monospace">
            {resistance >= 1000 ? `${resistance / 1000}kΩ` : `${resistance}Ω`}
          </text>
          {renderPins()}
        </g>
      );
    }

    // ═══ Push Button ═══════════════════════════════════════════════════
    case 'push-button': {
      const pressed = state?.pressed || false;
      const buttonColor = '#ef4444';
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Base body */}
          <rect x="0" y="0" width="48" height="48" rx="1.76" fill="#464646" />
          <rect x="2.85" y="2.85" width="42.3" height="42.3" rx="0.84" fill="#eaeaea" />
          {/* Corner holes */}
          <g fill="#1b1b1">
            <circle cx="7.07" cy="7.17" r="1.48" />
            <circle cx="40.65" cy="7.17" r="1.48" />
            <circle cx="40.65" cy="40.71" r="1.48" />
            <circle cx="7.07" cy="40.71" r="1.48" />
          </g>
          {/* Pin legs */}
          <g fill="#999" strokeWidth="1.0154">
            <path d="m49.47 9.71c0.24 0 0.43 0.19 0.43 0.42v1.55h8.87c0.48 0 0.87 0.37 0.87 0.84v2.03c0 0.47-0.39 0.84-0.87 0.84h-8.87v1.6c0 0.23-0.19 0.42-0.43 0.42h-1.47v-7.7z" />
            <path d="m49.47 30c0.24 0 0.43 0.19 0.43 0.42v1.55h8.87c0.48 0 0.87 0.37 0.87 0.84v2.03c0 0.47-0.39 0.84-0.87 0.84h-8.87v1.6c0 0.23-0.19 0.42-0.43 0.42h-1.47v-7.7z" />
            <path d="m-1.4 17.41c-0.24 0-0.43-0.19-0.43-0.42v-1.55h-8.87c-0.48 0-0.87-0.37-0.87-0.84v-2.03c0-0.47 0.39-0.84 0.87-0.84h8.87v-1.6c0-0.23 0.19-0.42 0.43-0.42h1.47v7.7z" />
            <path d="m-1.4 37.71c-0.24 0-0.43-0.19-0.43-0.42v-1.55h-8.87c-0.48 0-0.87-0.37-0.87-0.84v-2.03c0-0.47 0.39-0.84 0.87-0.84h8.87v-1.6c0-0.23 0.19-0.42 0.43-0.42h1.47v7.7z" />
          </g>
          {/* Tactile button cap */}
          <circle cx="24" cy="24" r="15.3" fill={pressed ? '#cc3333' : buttonColor} stroke="#2f2f2f" strokeOpacity="0.47" strokeWidth="0.32" />
          <circle cx="24" cy="24" r="11.6" fill={pressed ? '#dd5555' : buttonColor} stroke="#2f2f2f" strokeOpacity="0.3" strokeWidth="0.2" />
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ Buzzer ════════════════════════════════════════════════════════
    case 'buzzer': {
      const isOn = state?.buzzerOn || (pins[0]?.value > 2.5);
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Pin leads */}
          <line x1="28.92" y1="66" x2="28.92" y2="80" stroke="#000" strokeWidth="2" />
          <line x1="39.08" y1="66" x2="39.08" y2="80" stroke="#f00" strokeWidth="2" />
          {/* Buzzer body */}
          <ellipse cx="34" cy="34" rx="32.6" ry="32.6" fill="#1a1a1a" stroke="#000" strokeWidth="2.8" />
          {/* Concentric rings */}
          <circle cx="34" cy="34" r="25.39" fill="none" stroke="#000" strokeWidth="1.2" />
          <circle cx="34" cy="34" r="17.4" fill="none" stroke="#000" strokeWidth="1.2" />
          {/* Center dot */}
          <circle cx="34" cy="34" r="5.5" fill="#ccc" stroke="#000" strokeWidth="1" />
          {/* Sound waves */}
          {isOn && (
            <g fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7">
              <path d="M 70 15 Q 78 34 70 53" />
              <path d="M 76 8 Q 88 34 76 60" />
              <path d="M 82 2 Q 98 34 82 66" />
            </g>
          )}
          {/* Label */}
          <text x="34" y="37" textAnchor="middle" fill="#555" fontSize="3" fontFamily="monospace" style={{ pointerEvents: 'none' }}>♪</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ LCD 16x2 ═════════════════════════════════════════════════════
    case 'lcd-16x2': {
      const line1 = (state?.line1 || '').padEnd(16, ' ');
      const line2 = (state?.line2 || '').padEnd(16, ' ');
      const backlight = state?.backlight !== false;
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Green PCB */}
          <rect width="80" height="36" fill="#087f45" rx="1" />
          {/* LCD bezel */}
          <rect x="4" y="3.8" width="72" height="29" fill="#1a237e" rx="1.5" />
          {/* LCD Screen */}
          <rect x="5.5" y="5.3" width="69" height="26" rx="1" fill={backlight ? '#6cb201' : '#2a3a10'} />
          {/* Character grid overlay */}
          <rect x="5.5" y="5.3" width="69" height="26" rx="1" fill="url(#lcdGrid)" opacity="0.15" />
          {/* Backlight darkening */}
          {!backlight && <rect x="5.5" y="5.3" width="69" height="26" rx="1" fill="#000" opacity="0.5" />}
          {/* Text line 1 */}
          <text x="8" y="14" fill={backlight ? '#3a5a10' : '#1a2a08'} fontSize="5.5" fontFamily="monospace" letterSpacing="0.3">
            {line1}
          </text>
          {/* Text line 2 */}
          <text x="8" y="25" fill={backlight ? '#3a5a10' : '#1a2a08'} fontSize="5.5" fontFamily="monospace" letterSpacing="0.3">
            {line2}
          </text>
          {/* I2C Backpack */}
          <rect x="23" y="30.2" width="34" height="5" rx="0.5" fill="#1a237e" stroke="#0d1440" strokeWidth="0.3" />
          <text x="40" y="34" textAnchor="middle" fill="#666" fontSize="2" fontFamily="monospace">PCF8574</text>
          {/* Label */}
          <text x="40" y="38.5" textAnchor="middle" fill="#aaa" fontSize="3" fontFamily="monospace">LCD 16x2 I2C</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ Photoresistor (LDR) ═══════════════════════════════════════════
    case 'photoresistor': {
      const val = state?.lightLevel ?? 512;
      const brightness = val / 1023;
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Disc body */}
          <circle cx="20" cy="20" r="18" fill={`rgba(139, 92, 42, ${0.3 + brightness * 0.5})`} stroke="#8b5c2a" strokeWidth="1.5" />
          {/* Zigzag pattern */}
          <path d="M 12 12 L 15 18 L 12 24 L 15 30 L 18 24 L 15 18 L 18 12" stroke="#8b5c2a" strokeWidth="0.8" fill="none" />
          <path d="M 22 12 L 25 18 L 22 24 L 25 30 L 28 24 L 25 18 L 28 12" stroke="#8b5c2a" strokeWidth="0.8" fill="none" />
          {/* Center disc */}
          <circle cx="20" cy="20" r="5" fill="#dae3eb" opacity="0.6" />
          {/* Semicircular electrodes */}
          <path d="M 20 15 A 5 5 0 0 1 20 25" fill="none" stroke="#8b5c2a" strokeWidth="0.5" />
          <path d="M 16 20 A 5 5 0 0 1 24 20" fill="none" stroke="#8b5c2a" strokeWidth="0.5" />
          {/* Leads */}
          <line x1="15" y1="10" x2="15" y2="0" stroke="#ccc" strokeWidth="1" />
          <line x1="25" y1="10" x2="25" y2="0" stroke="#ccc" strokeWidth="1" />
          {/* Value display */}
          <text x="20" y="42" textAnchor="middle" fill="#888" fontSize="4" fontFamily="monospace">{val}</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ DHT22 ════════════════════════════════════════════════════════
    case 'dht22': {
      const temp = state?.temp ?? null;
      const humidity = state?.humidity ?? null;
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Pin headers */}
          <g fill="#ccc" strokeLinecap="round" strokeWidth="0.84">
            <rect x="14.28" y="95.54" width="3" height="28" rx="0.8" />
            <rect x="24.44" y="95.54" width="3" height="28" rx="0.8" />
            <rect x="34.6" y="95.54" width="3" height="28" rx="0.8" />
            <rect x="44.76" y="95.54" width="3" height="28" rx="0.8" />
          </g>
          {/* Sensor body */}
          <path
            d="M60.2 95.98V20.13c0-0.43-4.28-19.85-10.65-19.84l-38.57-0.01C4.78 0.28 0.2 19.7 0.2 20.13v75.85c0 0.43 0.34 0.77 0.77 0.77h58.46a0.77 0.77 0 00 0.77-0.77z M30.46 3.79h0.02c4.32 0 7.82 3.39 7.82 7.57s-3.5 7.57-7.82 7.57-7.82-3.39-7.82-7.57c0-4.18 3.49-7.56 7.81-7.57z"
            fill="#f2f2f2"
            stroke="#000"
            strokeLinecap="round"
            strokeWidth="0.4"
          />
          {/* Ventilation grid */}
          <g fill="none" stroke="#ccc" strokeWidth="0.3">
            <rect x="8" y="27" width="10" height="12" rx="0.5" />
            <rect x="21" y="27" width="10" height="12" rx="0.5" />
            <rect x="34" y="27" width="10" height="12" rx="0.5" />
            <rect x="8" y="43" width="10" height="12" rx="0.5" />
            <rect x="21" y="43" width="10" height="12" rx="0.5" />
            <rect x="34" y="43" width="10" height="12" rx="0.5" />
            <rect x="8" y="59" width="10" height="12" rx="0.5" />
            <rect x="21" y="59" width="10" height="12" rx="0.5" />
            <rect x="34" y="59" width="10" height="12" rx="0.5" />
          </g>
          {/* Label */}
          <text x="15" y="91.5" fill="#000" fontFamily="sans-serif" fontSize="8.8" strokeWidth="0.2" style={{ lineHeight: 1.25 }}>
            DHT22
          </text>
          {/* Readings */}
          {temp !== null && (
            <text x="50" y="85" textAnchor="middle" fill="#e74c3c" fontSize="5" fontFamily="monospace">
              {temp}°C
            </text>
          )}
          {humidity !== null && (
            <text x="50" y="93" textAnchor="middle" fill="#3498db" fontSize="5" fontFamily="monospace">
              {humidity}%
            </text>
          )}
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ Servo Motor ═══════════════════════════════════════════════════
    case 'servo-motor': {
      const angle = state?.angle ?? 90;
      const hornRad = (angle * Math.PI) / 180;
      const hornLen = 28;
      const hornEndX = 55 + Math.cos(hornRad) * hornLen;
      const hornEndY = 48 - Math.sin(hornRad) * hornLen;

      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Wire leads */}
          <g strokeWidth="2.7" fill="none">
            <path stroke="#b44200" d="m 41.66,56.6 c0,0 -13.2,0.96 -17.33,0 -2.48,-0.58 -4.24,-6.2 -5.95,-6.31" />
            <path stroke="#ff2300" d="m41.65 59.6h-25.19" />
            <path stroke="#f47b00" d="m 41.66,62.6 c0,0 -13.04,-0.61 -17.33,-0.15 -2.75,0.29 -4.8,6.82 -5.91,6.73" />
          </g>
          {/* Connector housing */}
          <rect fill="#666" y="45.5" width="25.71" height="28" rx="1.14" />
          {/* Connector pins */}
          <g fill="#ccc">
            <rect x="6.32" y="50.06" width="3.72" height="3.71" rx="0.3" />
            <rect x="6.32" y="59.66" width="3.72" height="3.71" rx="0.3" />
            <rect x="6.32" y="69.26" width="3.72" height="3.71" rx="0.3" />
          </g>
          {/* Motor body */}
          <rect fill="#666" x="25.7" y="37.9" width="90.24" height="43.73" rx="5.33" />
          {/* Motor mounting tabs */}
          <path fill="#4d4d4d" d="m163.92 66.87a7.09 7.09 0 1 1 5.81-11.14 0.18 0.18 0 0 0 0.33-0.1v-14.35h-17.66v36.98h17.68v-14.35a0.18 0.18 0 0 0-0.33-0.11 7.08 7.08 0 0 1-5.83 3.06z" />
          <path fill="#4d4d4d" d="m55.07 66.75a7.09 7.09 0 1 0-5.83-11.14 0.18 0.18 0 0 1-0.33-0.1v-14.35h17.68v36.98h-17.68v-14.35a0.18 0.18 0 0 1 0.33-0.11 7.08 7.08 0 0 0 5.83 3.06z" />
          {/* Main body */}
          <rect fill="#666" x="64.26" y="37.91" width="90.24" height="43.73" rx="5.33" />
          {/* Shaft area */}
          <path fill="gray" d="m110.07 50.01h-14.42v19.54h14.42a9.77 9.77 0 0 0 0-19.54z" />
          {/* Horn */}
          <line
            x1="55"
            y1="48"
            x2={hornEndX}
            y2={hornEndY}
            stroke="#ccc"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Center shaft */}
          <circle fill="#999" cx="55" cy="48" r="18.6" />
          <circle fill="gray" cx="55" cy="48" r="8.37" />
          <circle fill="#ccc" cx="55" cy="48" r="6.25" />
          {/* Cross on shaft */}
          <path fill="#666" d="m58.44 50.74-2.38-2.42a0.43 0.43 0 0 1 0-0.6l2.43-2.39a0.65 0.65 0 0 0 0.07-0.87 0.63 0.63 0 0 0-0.93-0.05l-2.44 2.4a0.43 0.43 0 0 1-0.61 0l-2.39-2.42a0.65 0.65 0 0 0-0.87-0.07 0.63 0.63 0 0 0-0.05 0.93l2.4 2.43a0.43 0.43 0 0 1 0 0.61l-2.41 2.39a0.65 0.65 0 0 0-0.07 0.87 0.63 0.63 0 0 0 0.93 0.05l2.44-2.4a0.43 0.43 0 0 1 0.6 0l2.39 2.44a0.63 0.63 0 0 0 0.93-0.04 0.65 0.65 0 0 0-0.04-0.87z" />
          {/* Angle label */}
          <text x="55" y="92" textAnchor="middle" fill="#888" fontSize="5" fontFamily="monospace">{angle}°</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ Potentiometer ═════════════════════════════════════════════════
    case 'potentiometer': {
      const value = state?.value ?? 512;
      const percent = value / 1023;
      const knobDeg = -135 + percent * 270;

      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Case */}
          <rect x="0.6" y="0.6" width="78" height="78" rx="4.92" fill="#045881" stroke="#045881" strokeWidth="1.2" />
          {/* Label bar */}
          <rect x="21.6" y="2.8" width="36.4" height="7.6" fill="#ccdae3" strokeWidth="0.6" />
          {/* Knob body */}
          <ellipse cx="39.64" cy="32.72" rx="29.08" ry="29.72" fill="#e4e8eb" strokeWidth="0.6" />
          {/* Inner ring */}
          <ellipse cx="39.8" cy="32.24" rx="26.4" ry="26.32" fill="#c3c2c3" strokeWidth="0.6" />
          {/* Indicator line */}
          <rect
            x="40"
            y="8"
            width="1.68"
            height="12.4"
            fill="#333"
            transform={`rotate(${knobDeg} 40 33)`}
            rx="0.5"
          />
          {/* Center dot */}
          <circle cx="40" cy="33" r="2" fill="#888" />
          {/* Pin labels */}
          <g strokeWidth="0.6" fill="#fff">
            <text x="24.84" y="66.4" fontSize="4" fontFamily="monospace">GND</text>
            <text x="36.8" y="66.52" fontSize="4" fontFamily="monospace">SIG</text>
            <text x="46" y="66.36" fontSize="4" fontFamily="monospace">VCC</text>
          </g>
          {/* Mounting holes */}
          <g fill="#fff" strokeWidth="0.6">
            <ellipse cx="6.72" cy="7.24" rx="3.96" ry="3.84" />
            <ellipse cx="5.92" cy="73.48" rx="3.96" ry="3.84" />
            <ellipse cx="71.88" cy="73.88" rx="3.96" ry="3.84" />
            <ellipse cx="72.28" cy="7.64" rx="3.96" ry="3.84" />
          </g>
          {/* Pin pads */}
          <g fill="#b3b1b0" strokeWidth="0.6">
            <ellipse cx="30.72" cy="72" rx="2.44" ry="2.52" />
            <ellipse cx="40.88" cy="72" rx="2.44" ry="2.52" />
            <ellipse cx="51.04" cy="72" rx="2.44" ry="2.52" />
          </g>
          {/* Value display */}
          <text x="40" y="80" textAnchor="middle" fill="#aaa" fontSize="4" fontFamily="monospace">{value}</text>
          {renderPins()}
          {renderPinLabels()}
        </g>
      );
    }

    // ═══ Ultrasonic HC-SR04 ═══════════════════════════════════════════
    case 'ultrasonic-hc-sr04': {
      const distance = state?.distance ?? null;
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* PCB Board */}
          <path
            d="M0 0v83.8h180V0zm5.69 1.86a4 4 0 010 8 4 4 0 010-8zm167.82 0a4 4 0 010 8 4 4 0 010-8zM5.69 73.94a4 4 0 010 8 4 4 0 010-8zm167.82 0a4 4 0 010 8 4 4 0 010-8z"
            fill="#456f93"
          />
          {/* Traces */}
          <path
            d="M61.17 23.55l11.74-11.74v12.5l11.78 11.78v40.57"
            fill="none"
            stroke="#355a7c"
            strokeWidth="3.43"
          />
          {/* Left transducer */}
          <circle cx="35.92" cy="40" r="34.44" fill="#dcdcdc" />
          <circle cx="35.92" cy="40" r="28.68" fill="#222" />
          <circle cx="35.92" cy="40" r="22.12" fill="#777" fillOpacity="0.992" />
          <circle cx="35.92" cy="40" r="14.36" fill="#b9b9b9" />
          <circle cx="35.96" cy="40" r="1.11" fill="#777" fillOpacity="0.818" />
          {/* Right transducer */}
          <circle cx="144.12" cy="40" r="34.44" fill="#dcdcdc" />
          <circle cx="144.12" cy="40" r="28.68" fill="#222" />
          <circle cx="144.12" cy="40" r="22.12" fill="#777" fillOpacity="0.992" />
          <circle cx="144.12" cy="40" r="14.36" fill="#b9b9b9" />
          <circle cx="144.16" cy="40" r="1.11" fill="#777" fillOpacity="0.818" />
          {/* Crystal oscillator */}
          <rect rx="8.28" y="2.5" x="68.44" height="16.56" width="41.09" fill="#878787" stroke="#424242" strokeWidth="1.47" />
          {/* Pin headers */}
          <g fill="black">
            <rect x="71.48" y="72" rx="2.27" width="9" height="9.08" />
            <rect x="81.64" y="72" rx="2.27" width="9" height="9.08" />
            <rect x="91.8" y="72" rx="2.27" width="9" height="9.08" />
            <rect x="101.96" y="72" rx="2.27" width="9" height="9.08" />
          </g>
          <g fill="#ccc" strokeLinecap="round" strokeWidth="0.84">
            <rect x="74.44" y="76" width="3" height="28" rx="0.8" />
            <rect x="84.6" y="76" width="3" height="28" rx="0.8" />
            <rect x="94.76" y="76" width="3" height="28" rx="0.8" />
            <rect x="104.92" y="76" width="3" height="28" rx="0.8" />
          </g>
          {/* Label */}
          <text fontWeight="400" fontSize="8.8" fill="#e6e6e6" strokeWidth="0.22">
            <tspan y="32" x="70.4">HC-SR04</tspan>
          </text>
          {/* Rotated pin labels */}
          <text transform="rotate(-90)" fontWeight="400" fontSize="6.2" fill="#e6e6e6" strokeWidth="0.156">
            <tspan x="-70.36" y="78.24">VCC</tspan>
            <tspan x="-70.36" y="88.4">TRIG</tspan>
            <tspan x="-70.36" y="98.56">ECHO</tspan>
            <tspan x="-70.36" y="108.72">GND</tspan>
          </text>
          {/* Distance display */}
          {distance !== null && (
            <text x="90" y="62" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="monospace" fontWeight="bold">
              {distance}cm
            </text>
          )}
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
