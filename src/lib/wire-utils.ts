// ─── Orthogonal Wire Routing Utilities ──────────────────────────────────────
// Manhattan routing: always horizontal-first with smart elbows

export interface Point {
  x: number;
  y: number;
}

/**
 * Generate an orthogonal (Manhattan) path from start to end, going through waypoints.
 * Always does horizontal segments first (horizontal-first routing).
 */
export function generateOrthogonalPath(
  start: Point,
  waypoints: Point[],
  end: Point
): Point[] {
  const points: Point[] = [start];

  // Collect all target points (waypoints + end)
  const targets = [...waypoints, end];

  for (const target of targets) {
    const current = points[points.length - 1];
    const dx = target.x - current.x;
    const dy = target.y - current.y;

    // If no movement needed, skip
    if (dx === 0 && dy === 0) continue;

    // Horizontal-first: go horizontal then vertical
    if (dx !== 0) {
      points.push({ x: target.x, y: current.y });
    }
    if (dy !== 0) {
      points.push({ x: target.x, y: target.y });
    }
  }

  return points;
}

/**
 * Generate a smart orthogonal preview path for wire drawing.
 * Uses elbow routing based on distance for natural feel.
 */
export function generatePreviewPath(
  start: Point,
  waypoints: Point[],
  mouseX: number,
  mouseY: number
): Point[] {
  // If we have waypoints, route through them then to mouse
  if (waypoints.length > 0) {
    return generateOrthogonalPath(start, waypoints, { x: mouseX, y: mouseY });
  }

  // Simple elbow: go horizontal first, then vertical to mouse
  const dx = Math.abs(mouseX - start.x);
  const dy = Math.abs(mouseY - start.y);

  if (dx === 0 && dy === 0) {
    return [start];
  }

  // Horizontal-first routing
  if (dx !== 0) {
    // Go horizontal partway then vertical
    const midX = mouseX;
    return [
      start,
      { x: midX, y: start.y },
      { x: midX, y: mouseY },
    ];
  }

  // Purely vertical movement
  return [
    start,
    { x: start.x, y: mouseY },
  ];
}

/**
 * Convert an array of points to an SVG path "d" string with only L commands.
 */
export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

// ─── Wire Color Auto-Detection ─────────────────────────────────────────────

/**
 * Auto-detect wire color based on pin ID/name.
 * Red for VCC/power, Black for GND/ground, Green default.
 */
export function autoWireColor(pinId: string): string {
  const id = pinId.toLowerCase();
  if (id.includes('5v') || id.includes('3v3') || id.includes('3.3v') || id.includes('vin') || id.includes('vcc')) {
    return '#ef4444'; // red for power
  }
  if (id.includes('gnd') || id.includes('ground')) {
    return '#1a1a1a'; // near-black for ground
  }
  return '#22c55e'; // green default
}

/**
 * Get the signal type classification for a pin.
 */
export function getWireSignalType(pinId: string): 'power-vcc' | 'power-gnd' | 'analog' | 'digital' | 'pwm' | 'i2c' | 'spi' | 'usart' | undefined {
  const id = pinId.toLowerCase();
  if (id.includes('gnd') || id.includes('ground')) return 'power-gnd';
  if (id.includes('5v') || id.includes('3v3') || id.includes('3.3v') || id.includes('vin') || id.includes('vcc')) return 'power-vcc';
  if (id.includes('a0') || id.includes('a1') || id.includes('a2') || id.includes('a3') || id.includes('a4') || id.includes('a5')) {
    if (id.includes('sda') || id.includes('scl')) return 'i2c';
    return 'analog';
  }
  if (id.includes('sda') || id.includes('scl')) return 'i2c';
  if (id.includes('mosi') || id.includes('miso') || id.includes('sck') || id.includes('ss')) return 'spi';
  if (id.includes('tx') || id.includes('rx')) return 'usart';
  if (id.includes('~') || id.includes('pwm') || id.includes('sig')) return 'pwm';
  return 'digital';
}

// ─── Pin Type Colors ──────────────────────────────────────────────────────

/**
 * Get the dot color for a pin based on its type.
 */
export function pinTypeColor(type: string): string {
  switch (type) {
    case 'power': return '#ef4444';   // red
    case 'ground': return '#1a1a1a';  // black
    case 'analog': return '#3b82f6';  // blue
    case 'digital': return '#6b7280';  // gray
    case 'pwm': return '#f59e0b';     // amber
    case 'i2c': return '#8b5cf6';     // purple
    case 'spi': return '#ec4899';     // pink
    case 'uart': return '#14b8a6';    // teal
    default: return '#6b7280';        // gray
  }
}
