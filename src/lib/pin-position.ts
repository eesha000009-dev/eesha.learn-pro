// ─── Pin Position Calculator ─────────────────────────────────────────────────
// Computes absolute pin positions and finds closest pins for proximity detection.

import type { PlacedComponent } from '@/types';

export interface PinPosition {
  componentId: string;
  pinId: string;
  x: number;
  y: number;
  side: string;
  type: string;
  label: string;
}

/**
 * Get the world position of a specific pin on a component.
 * Returns { x, y } absolute coordinates or null if not found.
 */
export function getPinWorldPosition(
  componentId: string,
  pinId: string,
  components: PlacedComponent[]
): { x: number; y: number } | null {
  const comp = components.find((c) => c.id === componentId);
  if (!comp) return null;
  const pin = comp.pins.find((p) => p.id === pinId);
  if (!pin) return null;
  return {
    x: comp.x + pin.offset.x,
    y: comp.y + pin.offset.y,
  };
}

/**
 * Find the closest pin to a given world position.
 * Returns null if no pin is within the threshold distance.
 */
export function findClosestPin(
  worldX: number,
  worldY: number,
  components: PlacedComponent[],
  threshold: number = 15
): PinPosition | null {
  let closest: PinPosition | null = null;
  let minDist = threshold;

  for (const comp of components) {
    for (const pin of comp.pins) {
      const px = comp.x + pin.offset.x;
      const py = comp.y + pin.offset.y;
      const dist = Math.sqrt((worldX - px) ** 2 + (worldY - py) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = {
          componentId: comp.id,
          pinId: pin.id,
          x: px,
          y: py,
          side: pin.side,
          type: pin.type,
          label: pin.label,
        };
      }
    }
  }

  return closest;
}

/**
 * Get all pin positions for all components. Useful for rendering pin dots.
 */
export function getAllPinPositions(components: PlacedComponent[]): PinPosition[] {
  const positions: PinPosition[] = [];
  for (const comp of components) {
    for (const pin of comp.pins) {
      positions.push({
        componentId: comp.id,
        pinId: pin.id,
        x: comp.x + pin.offset.x,
        y: comp.y + pin.offset.y,
        side: pin.side,
        type: pin.type,
        label: pin.label,
      });
    }
  }
  return positions;
}
