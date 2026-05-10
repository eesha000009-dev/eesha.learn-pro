/**
 * Wokwi-compatible diagram.json import/export utilities
 * Based on Wokwi diagram.json format (MIT License)
 * Copyright (c) 2020 Uri Shaked — https://github.com/wokwi/wokwi-elements
 */

import type { PlacedComponent, Wire } from '@/types';
import { COMPONENT_DEFINITIONS } from '@/lib/component-defs';

// ─── Wokwi diagram.json Types ──────────────────────────────────────────────

export interface WokwiDiagram {
  version: number;
  author: string;
  editor: string;
  parts: WokwiPart[];
  connections: WokwiConnection[];
}

export interface WokwiPart {
  id: string;
  type: string;
  left: number;
  top: number;
  attrs?: Record<string, string | number | boolean>;
  rotate?: number;
  hide?: boolean;
}

export type WokwiConnection = [string, string]; // ["partId:pinName", "partId:pinName"]

// ─── Part Type Mapping ─────────────────────────────────────────────────────

/** Our internal defId → Wokwi type string */
const DEF_ID_TO_WOKWI: Record<string, string> = {
  'arduino-uno': 'wokwi-arduino-uno',
  'led-red': 'wokwi-led',
  'led-green': 'wokwi-led',
  'led-blue': 'wokwi-led',
  'led-yellow': 'wokwi-led',
  'resistor': 'wokwi-resistor',
  'push-button': 'wokwi-pushbutton',
  'buzzer': 'wokwi-buzzer',
  'lcd-16x2': 'wokwi-lcd1602',
  'photoresistor': 'wokwi-photoresistor-sensor',
  'dht22': 'wokwi-dht22',
  'servo-motor': 'wokwi-servo',
  'potentiometer': 'wokwi-potentiometer',
  'rgb-led': 'wokwi-rgb-led',
  'ultrasonic-hc-sr04': 'wokwi-hc-sr04',
};

/** Wokwi type string → our internal defId */
const WOKWI_TO_DEF_ID: Record<string, string> = {};
for (const [defId, wokwiType] of Object.entries(DEF_ID_TO_WOKWI)) {
  WOKWI_TO_DEF_ID[wokwiType] = defId;
}

// ─── Pin ID Mapping ────────────────────────────────────────────────────────

/** Our internal pinId → Wokwi pin name, per component defId */
const PIN_TO_WOKWI: Record<string, Record<string, string>> = {
  'arduino-uno': {
    d0: '0', d1: '1', d2: '2', d3: '3', d4: '4', d5: '5', d6: '6', d7: '7',
    d8: '8', d9: '9', d10: '10', d11: '11', d12: '12', d13: '13',
    a0: 'A0', a1: 'A1', a2: 'A2', a3: 'A3', a4: 'A4', a5: 'A5',
    '5v': '5V', '3v3': '3.3V', rst: 'RESET',
    gnd1: 'GND.1', gnd2: 'GND.2', vin: 'VIN',
  },
  'led-red': { anode: 'A', cathode: 'K' },
  'led-green': { anode: 'A', cathode: 'K' },
  'led-blue': { anode: 'A', cathode: 'K' },
  'led-yellow': { anode: 'A', cathode: 'K' },
  'resistor': { pin1: '1', pin2: '2' },
  'push-button': { pin1: '1.l', pin2: '2.l', pin3: '1.r', pin4: '2.r' },
  'buzzer': { pos: '1', neg: '2' },
  'lcd-16x2': { vcc: 'VCC', gnd: 'GND', sda: 'SDA', scl: 'SCL' },
  'photoresistor': { pin1: '1', pin2: '2' },
  'dht22': { vcc: 'VCC', dat: 'SDA', nc: 'NC', gnd: 'GND' },
  'servo-motor': { gnd: 'GND', vcc: 'V+', sig: 'PWM' },
  'potentiometer': { gnd: 'GND', sig: 'SIG', vcc: 'VCC' },
  'rgb-led': { red: 'R', gnd: 'COM', green: 'G', blue: 'B' },
  'ultrasonic-hc-sr04': { vcc: 'VCC', trig: 'TRIG', echo: 'ECHO', gnd: 'GND' },
};

/** Wokwi pin name → our internal pinId, per component defId */
const WOKWI_TO_PIN: Record<string, Record<string, string>> = {};
for (const [defId, pinMap] of Object.entries(PIN_TO_WOKWI)) {
  WOKWI_TO_PIN[defId] = {};
  for (const [internal, wokwi] of Object.entries(pinMap)) {
    WOKWI_TO_PIN[defId][wokwi] = internal;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Generate a human-readable short ID for export (e.g., "led1", "arduino-uno") */
function generateExportId(comp: PlacedComponent, existingIds: Set<string>): string {
  const baseNames: Record<string, string> = {
    'arduino-uno': 'arduino',
    'led-red': 'led', 'led-green': 'led', 'led-blue': 'led', 'led-yellow': 'led',
    'resistor': 'r', 'push-button': 'btn', 'buzzer': 'buzzer',
    'lcd-16x2': 'lcd', 'photoresistor': 'ldr', 'dht22': 'dht',
    'servo-motor': 'servo', 'potentiometer': 'pot', 'rgb-led': 'rgb',
    'ultrasonic-hc-sr04': 'hc-sr04',
  };
  const base = baseNames[comp.defId] || comp.defId;
  let counter = 1;
  while (existingIds.has(counter === 1 ? base : `${base}${counter}`)) {
    counter++;
  }
  const id = counter === 1 ? base : `${base}${counter}`;
  existingIds.add(id);
  return id;
}

/** Get default attributes for a component type */
function getDefaultAttrs(defId: string): Record<string, string> | undefined {
  switch (defId) {
    case 'led-red': return { color: 'red' };
    case 'led-green': return { color: 'green' };
    case 'led-blue': return { color: 'blue' };
    case 'led-yellow': return { color: 'yellow' };
    case 'resistor': return { value: '220' };
    default: return undefined;
  }
}

/** Infer our defId from Wokwi type + attrs */
function inferDefId(wokwiType: string, attrs?: Record<string, string | number | boolean>): string {
  // Direct mapping first
  if (WOKWI_TO_DEF_ID[wokwiType]) return WOKWI_TO_DEF_ID[wokwiType];

  // For LEDs, infer color from attrs
  if (wokwiType === 'wokwi-led' && attrs?.color) {
    const color = String(attrs.color).toLowerCase();
    if (color === 'green') return 'led-green';
    if (color === 'blue') return 'led-blue';
    if (color === 'yellow') return 'led-yellow';
    return 'led-red'; // default
  }

  return wokwiType;
}

// ─── Export ────────────────────────────────────────────────────────────────

/**
 * Export from our internal state to Wokwi diagram.json format.
 */
export function exportToWokwiDiagram(
  components: PlacedComponent[],
  wires: Wire[],
  author?: string,
): WokwiDiagram {
  const usedIds = new Set<string>();
  const idMap = new Map<string, string>(); // our comp id → export id

  const parts: WokwiPart[] = components.map((comp) => {
    const exportId = generateExportId(comp, usedIds);
    idMap.set(comp.id, exportId);
    const wokwiType = DEF_ID_TO_WOKWI[comp.defId] || comp.defId;
    const defaultAttrs = getDefaultAttrs(comp.defId);

    const part: WokwiPart = {
      id: exportId,
      type: wokwiType,
      left: Math.round(comp.x),
      top: Math.round(comp.y),
    };

    if (defaultAttrs) part.attrs = defaultAttrs;
    if (comp.rotation && comp.rotation !== 0) part.rotate = comp.rotation;

    return part;
  });

  const connections: WokwiConnection[] = [];
  for (const wire of wires) {
    const fromComp = components.find((c) => c.id === wire.from.componentId);
    const toComp = components.find((c) => c.id === wire.to.componentId);
    if (!fromComp || !toComp) continue;

    const fromExportId = idMap.get(wire.from.componentId);
    const toExportId = idMap.get(wire.to.componentId);
    if (!fromExportId || !toExportId) continue;

    const pinMapFrom = PIN_TO_WOKWI[fromComp.defId];
    const pinMapTo = PIN_TO_WOKWI[toComp.defId];
    if (!pinMapFrom || !pinMapTo) continue;

    const wokwiPinFrom = pinMapFrom[wire.from.pinId];
    const wokwiPinTo = pinMapTo[wire.to.pinId];
    if (!wokwiPinFrom || !wokwiPinTo) continue;

    connections.push([`${fromExportId}:${wokwiPinFrom}`, `${toExportId}:${wokwiPinTo}`]);
  }

  return {
    version: 1,
    author: author || 'Eesha Learn User',
    editor: 'eesha-learn',
    parts,
    connections,
  };
}

// ─── Import ────────────────────────────────────────────────────────────────

/**
 * Import from Wokwi diagram.json format to our internal state.
 * Returns components and wires arrays, and an idMap (export id → our internal id).
 */
export function importFromWokwiDiagram(
  diagram: WokwiDiagram,
): { components: PlacedComponent[]; wires: Wire[] } {
  const idMap = new Map<string, string>(); // export id → our internal id
  const components: PlacedComponent[] = [];

  for (const part of diagram.parts) {
    if (part.hide) continue; // skip hidden parts

    const defId = inferDefId(part.type, part.attrs);
    const def = COMPONENT_DEFINITIONS.find((d) => d.type === defId);

    if (!def) {
      console.warn(`[diagram] Unknown part type: ${part.type} (inferred defId: ${defId}), skipping`);
      continue;
    }

    const id = `${defId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    idMap.set(part.id, id);

    const comp: PlacedComponent = {
      id,
      defId: def.type,
      x: part.left,
      y: part.top,
      rotation: part.rotate || 0,
      pins: def.pins.map((p) => ({ ...p })),
      state: def.type === 'arduino-uno' ? { ledOn: false, powerLed: true } : {},
      props: part.attrs ? { ...part.attrs } : undefined,
    };

    components.push(comp);
  }

  const wires: Wire[] = [];
  for (const [fromStr, toStr] of diagram.connections) {
    const [fromId, fromPin] = parseConnectionRef(fromStr);
    const [toId, toPin] = parseConnectionRef(toStr);
    if (!fromId || !toId || !fromPin || !toPin) continue;

    const fromInternalId = idMap.get(fromId);
    const toInternalId = idMap.get(toId);
    if (!fromInternalId || !toInternalId) continue;

    const fromComp = components.find((c) => c.id === fromInternalId);
    const toComp = components.find((c) => c.id === toInternalId);
    if (!fromComp || !toComp) continue;

    const pinMapFrom = WOKWI_TO_PIN[fromComp.defId];
    const pinMapTo = WOKWI_TO_PIN[toComp.defId];
    if (!pinMapFrom || !pinMapTo) continue;

    const internalPinFrom = pinMapFrom[fromPin];
    const internalPinTo = pinMapTo[toPin];
    if (!internalPinFrom || !internalPinTo) continue;

    const wireId = `wire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    wires.push({
      id: wireId,
      from: { componentId: fromInternalId, pinId: internalPinFrom },
      to: { componentId: toInternalId, pinId: internalPinTo },
      color: '#ef4444',
    });
  }

  return { components, wires };
}

// ─── Parse "partId:pinName" reference ──────────────────────────────────────

function parseConnectionRef(ref: string): [string | null, string | null] {
  const colonIdx = ref.indexOf(':');
  if (colonIdx === -1) return [ref, null];
  return [ref.slice(0, colonIdx), ref.slice(colonIdx + 1)];
}

// ─── Local Storage Keys ────────────────────────────────────────────────────

export const LS_KEY_DIAGRAM = 'eesha-learn-diagram';
export const LS_KEY_EDITOR = 'eesha-learn-editor';

/**
 * Serialize the full project state (diagram + editor tabs) for localStorage.
 */
export interface ProjectSave {
  diagram: WokwiDiagram;
  editorTabs: Array<{ id: string; name: string; language: string; content: string }>;
}

/**
 * Build the full project save object.
 */
export function buildProjectSave(
  components: PlacedComponent[],
  wires: Wire[],
  editorTabs: Array<{ id: string; name: string; language: string; content: string }>,
  author?: string,
): ProjectSave {
  return {
    diagram: exportToWokwiDiagram(components, wires, author),
    editorTabs: editorTabs.map((t) => ({ ...t })),
  };
}
