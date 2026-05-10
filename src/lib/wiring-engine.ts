/**
 * Eesha Learn — Wiring Engine
 * ============================
 * Core pin-to-pin wiring system for the circuit simulator.
 * Handles wire creation, routing, snap-to-pin, voltage propagation,
 * and hit testing for wire selection.
 *
 * Routing strategy: Wokwi-style hybrid — horizontal run from source pin,
 * bezier curve to midpoint, then horizontal run to target pin.
 * This produces clean, professional-looking wire paths.
 */

// ========================== TYPES ==========================

export interface PlacedComponent {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  pins: {
    id: string;
    name: string;
    x: number;
    y: number;
    side: string;
    type: string;
  }[];
  props?: Record<string, unknown>;
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  color: string;
  route: { x: number; y: number }[];
  isPowered: boolean;
  voltage: number;
}

export interface WiringState {
  wires: Wire[];
  activeWire: {
    fromComponentId: string;
    fromPinId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null;
  selectedWireId: string | null;
}

// ========================== WIRE COLORS ==========================

const WIRE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#14b8a6', // teal
];

// ========================== HELPERS ==========================

let wireCounter = 0;

function nextColor(): string {
  const color = WIRE_COLORS[wireCounter % WIRE_COLORS.length];
  wireCounter++;
  return color;
}

// ========================== WIRE ID ==========================

export function createWireId(): string {
  return `wire_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ========================== ROUTING ==========================

/**
 * Calculate wire route using Wokwi-style hybrid routing.
 *
 * Strategy:
 *   1. Start at source pin
 *   2. Run horizontally outward from the pin (away from component center)
 *   3. Bezier curve through the midpoint
 *   4. Run horizontally into the target pin
 *
 * Returns an array of { x, y } points that form a smooth path.
 * The first and last points are the source/target pins themselves.
 */
export function calculateWireRoute(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // If pins are very close (< 4px), just draw a straight line
  if (dist < 4) {
    return [
      { x: from.x, y: from.y },
      { x: to.x, y: to.y },
    ];
  }

  // If essentially horizontal (dy very small), use a simple S-curve
  if (absDy < 6) {
    const midX = (from.x + to.x) / 2;
    const sag = Math.min(absDx * 0.12, 20);
    const sagDir = from.x < to.x ? 1 : -1;

    return [
      { x: from.x, y: from.y },
      { x: from.x + dx * 0.2, y: from.y + sag * sagDir },
      { x: midX, y: from.y + sag * sagDir },
      { x: to.x - dx * 0.2, y: from.y + sag * sagDir },
      { x: to.x, y: to.y },
    ];
  }

  // If essentially vertical (dx very small), use a simple S-curve
  if (absDx < 6) {
    const midY = (from.y + to.y) / 2;
    const sag = Math.min(absDy * 0.12, 20);
    const sagDir = from.y < to.y ? 1 : -1;

    return [
      { x: from.x, y: from.y },
      { x: from.x + sag * sagDir, y: from.y + dy * 0.2 },
      { x: from.x + sag * sagDir, y: midY },
      { x: to.x + sag * sagDir, y: to.y - dy * 0.2 },
      { x: to.x, y: to.y },
    ];
  }

  // General case: hybrid routing with horizontal stubs + smooth curve
  // Horizontal run length from each pin
  const stubLength = Math.min(40, absDx * 0.25);

  // Direction of horizontal runs (extend outward from pin)
  const fromDirX = dx > 0 ? 1 : -1;
  const toDirX = dx > 0 ? -1 : 1;

  // Stub endpoints
  const stub1X = from.x + stubLength * fromDirX;
  const stub1Y = from.y;
  const stub2X = to.x + stubLength * toDirX;
  const stub2Y = to.y;

  // Midpoint between stubs for the bezier
  const midX = (stub1X + stub2X) / 2;
  const midY = (stub1Y + stub2Y) / 2;

  // Bezier control point tension — smoother for longer wires
  const tension = Math.min(dist * 0.3, 80);

  // Control points for cubic bezier approximation using 4 segments
  // Point 1: start of curve (end of source stub)
  // Point 2: first control point
  // Point 3: second control point
  // Point 4: end of curve (start of target stub)
  const cp1X = stub1X + tension * fromDirX;
  const cp1Y = stub1Y;
  const cp2X = stub2X + tension * toDirX;
  const cp2Y = stub2Y;

  return [
    // Source pin
    { x: from.x, y: from.y },
    // End of source horizontal stub
    { x: stub1X, y: stub1Y },
    // Bezier sample at t=0.25
    {
      x: bezierPoint(stub1X, cp1X, cp2X, stub2X, 0.25),
      y: bezierPoint(stub1Y, cp1Y, cp2Y, stub2Y, 0.25),
    },
    // Bezier midpoint at t=0.5
    {
      x: bezierPoint(stub1X, cp1X, cp2X, stub2X, 0.5),
      y: bezierPoint(stub1Y, cp1Y, cp2Y, stub2Y, 0.5),
    },
    // Bezier sample at t=0.75
    {
      x: bezierPoint(stub1X, cp1X, cp2X, stub2X, 0.75),
      y: bezierPoint(stub1Y, cp1Y, cp2Y, stub2Y, 0.75),
    },
    // Start of target horizontal stub
    { x: stub2X, y: stub2Y },
    // Target pin
    { x: to.x, y: to.y },
  ];
}

/**
 * Evaluate cubic bezier at parameter t ∈ [0, 1].
 */
function bezierPoint(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
}

// ========================== WIRE MANAGEMENT ==========================

export function addWire(
  state: WiringState,
  from: { componentId: string; pinId: string; x: number; y: number },
  to: { componentId: string; pinId: string; x: number; y: number },
): WiringState {
  // Prevent self-connection (same component + same pin)
  if (from.componentId === to.componentId && from.pinId === to.pinId) {
    return state;
  }

  // Prevent duplicate wires (same endpoints, either direction)
  const exists = state.wires.some(
    (w) =>
      (w.fromComponentId === from.componentId &&
        w.fromPinId === from.pinId &&
        w.toComponentId === to.componentId &&
        w.toPinId === to.pinId) ||
      (w.fromComponentId === to.componentId &&
        w.fromPinId === to.pinId &&
        w.toComponentId === from.componentId &&
        w.toPinId === from.pinId),
  );
  if (exists) {
    return state;
  }

  // Check if either pin is already connected (max 1 wire per pin, like Wokwi)
  if (isPinConnected(state, from.componentId, from.pinId)) {
    return state;
  }
  if (isPinConnected(state, to.componentId, to.pinId)) {
    return state;
  }

  const wire: Wire = {
    id: createWireId(),
    fromComponentId: from.componentId,
    fromPinId: from.pinId,
    toComponentId: to.componentId,
    toPinId: to.pinId,
    color: nextColor(),
    route: calculateWireRoute(
      { x: from.x, y: from.y },
      { x: to.x, y: to.y },
    ),
    isPowered: false,
    voltage: 0,
  };

  return {
    ...state,
    wires: [...state.wires, wire],
    activeWire: null,
  };
}

export function removeWire(
  state: WiringState,
  wireId: string,
): WiringState {
  return {
    ...state,
    wires: state.wires.filter((w) => w.id !== wireId),
    selectedWireId: state.selectedWireId === wireId ? null : state.selectedWireId,
  };
}

// ========================== QUERIES ==========================

export function getWiresForPin(
  state: WiringState,
  componentId: string,
  pinId: string,
): Wire[] {
  return state.wires.filter(
    (w) =>
      (w.fromComponentId === componentId && w.fromPinId === pinId) ||
      (w.toComponentId === componentId && w.toPinId === pinId),
  );
}

export function getWiresForComponent(
  state: WiringState,
  componentId: string,
): Wire[] {
  return state.wires.filter(
    (w) =>
      w.fromComponentId === componentId ||
      w.toComponentId === componentId,
  );
}

export function isPinConnected(
  state: WiringState,
  componentId: string,
  pinId: string,
): boolean {
  return state.wires.some(
    (w) =>
      (w.fromComponentId === componentId && w.fromPinId === pinId) ||
      (w.toComponentId === componentId && w.toPinId === pinId),
  );
}

// ========================== SNAP-TO-PIN ==========================

/**
 * Find the nearest component pin to a given canvas point.
 * Used during wire drawing for snap-to-pin feedback.
 */
export function findNearestPin(
  x: number,
  y: number,
  components: PlacedComponent[],
  maxDistance: number = 20,
): { componentId: string; pinId: string; x: number; y: number } | null {
  let nearest: { componentId: string; pinId: string; x: number; y: number; dist: number } | null = null;

  for (const comp of components) {
    for (const pin of comp.pins) {
      const dx = pin.x - x;
      const dy = pin.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= maxDistance) {
        if (!nearest || dist < nearest.dist) {
          nearest = {
            componentId: comp.id,
            pinId: pin.id,
            x: pin.x,
            y: pin.y,
            dist,
          };
        }
      }
    }
  }

  if (!nearest) return null;
  return {
    componentId: nearest.componentId,
    pinId: nearest.pinId,
    x: nearest.x,
    y: nearest.y,
  };
}

// ========================== VOLTAGE PROPAGATION ==========================

/**
 * Update wire states based on simulation pin states.
 * Propagates voltage through wires — if either end of a wire
 * is driven HIGH (voltage > 0), the wire is powered.
 */
export function propagateWireStates(
  state: WiringState,
  pinStates: Record<string, Record<string, { value: 'high' | 'low'; voltage: number }>>,
): WiringState {
  return {
    ...state,
    wires: state.wires.map((wire) => {
      const fromState = pinStates[wire.fromComponentId]?.[wire.fromPinId];
      const toState = pinStates[wire.toComponentId]?.[wire.toPinId];

      const fromVoltage = fromState?.voltage ?? 0;
      const toVoltage = toState?.voltage ?? 0;
      const fromHigh = fromState?.value === 'high';
      const toHigh = toState?.value === 'high';

      // Wire is powered if either end is HIGH or has voltage > 0
      const isPowered = fromHigh || toHigh || fromVoltage > 0 || toVoltage > 0;
      const voltage = Math.max(fromVoltage, toVoltage);

      return {
        ...wire,
        isPowered,
        voltage,
      };
    }),
  };
}

// ========================== HIT TESTING ==========================

/**
 * Check if a canvas point is near a wire's route.
 * Tests distance from point to each line segment in the route.
 */
export function hitTestWire(
  x: number,
  y: number,
  wire: Wire,
  tolerance: number = 8,
): boolean {
  const route = wire.route;
  if (route.length < 2) return false;

  for (let i = 0; i < route.length - 1; i++) {
    const p1 = route[i];
    const p2 = route[i + 1];

    if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= tolerance) {
      return true;
    }
  }

  // Also test distance to the start and end pins directly
  if (distToPoint(x, y, route[0].x, route[0].y) <= tolerance + 4) {
    return true;
  }
  const lastIdx = route.length - 1;
  if (distToPoint(x, y, route[lastIdx].x, route[lastIdx].y) <= tolerance + 4) {
    return true;
  }

  return false;
}

/**
 * Distance from point (px, py) to line segment (x1,y1)-(x2,y2).
 */
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return distToPoint(px, py, x1, y1);
  }

  // Project point onto line, clamped to [0, 1]
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return distToPoint(px, py, projX, projY);
}

function distToPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// ========================== WIRE ID LOOKUP ==========================

/**
 * Find a wire by its endpoints (either direction).
 * Useful for checking if a specific connection exists.
 */
export function findWireByEndpoints(
  state: WiringState,
  fromComponentId: string,
  fromPinId: string,
  toComponentId: string,
  toPinId: string,
): Wire | null {
  return (
    state.wires.find(
      (w) =>
        w.fromComponentId === fromComponentId &&
        w.fromPinId === fromPinId &&
        w.toComponentId === toComponentId &&
        w.toPinId === toPinId,
    ) ??
    state.wires.find(
      (w) =>
        w.fromComponentId === toComponentId &&
        w.fromPinId === toPinId &&
        w.toComponentId === fromComponentId &&
        w.toPinId === fromPinId,
    ) ??
    null
  );
}

/**
 * Get the total count of wires.
 */
export function getWireCount(state: WiringState): number {
  return state.wires.length;
}

/**
 * Remove all wires connected to a specific component.
 * Used when a component is deleted from the canvas.
 */
export function removeWiresForComponent(
  state: WiringState,
  componentId: string,
): WiringState {
  return {
    ...state,
    wires: state.wires.filter(
      (w) =>
        w.fromComponentId !== componentId &&
        w.toComponentId !== componentId,
    ),
    selectedWireId:
      state.selectedWireId &&
      state.wires.find((w) => w.id === state.selectedWireId)?.fromComponentId === componentId ||
      state.wires.find((w) => w.id === state.selectedWireId)?.toComponentId === componentId
        ? null
        : state.selectedWireId,
  };
}
