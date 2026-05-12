/**
 * Pin Propagation — Propagates electrical signals through wires
 *
 * When the MCU sets a pin HIGH/LOW, this module:
 * 1. Finds all wires connected to that pin
 * 2. Propagates the voltage to the connected component's pin
 * 3. Updates the connected component's state (e.g., LED on/off)
 *
 * This is designed to be MCU-agnostic — it works with any simulator
 * that reports pin value changes.
 */

import type { Wire, PlacedComponent } from '@/types';

export interface PinPropagationCallbacks {
  /** Update a component's pin value in the store */
  setComponentPinValue: (componentId: string, pinId: string, value: number) => void;
  /** Update a component's state (e.g., ledOn: true) */
  updateComponentState: (componentId: string, state: Record<string, any>) => void;
}

/**
 * Propagate a pin value change through all connected wires.
 *
 * @param componentId - The source component (e.g., Arduino UNO)
 * @param pinId - The source pin ID (e.g., 'd13')
 * @param value - The voltage (0 or 5)
 * @param wires - All wires in the circuit
 * @param components - All components in the circuit
 * @param callbacks - Store callbacks
 */
export function propagatePinChange(
  componentId: string,
  pinId: string,
  value: number,
  wires: Wire[],
  components: PlacedComponent[],
  callbacks: PinPropagationCallbacks,
): void {
  // Find all wires connected to this pin
  for (const wire of wires) {
    let targetCompId: string | null = null;
    let targetPinId: string | null = null;

    // Check if wire starts from this pin
    if (wire.from.componentId === componentId && wire.from.pinId === pinId) {
      targetCompId = wire.to.componentId;
      targetPinId = wire.to.pinId;
    }
    // Check if wire ends at this pin
    else if (wire.to.componentId === componentId && wire.to.pinId === pinId) {
      targetCompId = wire.from.componentId;
      targetPinId = wire.from.pinId;
    }

    if (!targetCompId || !targetPinId) continue;

    // Set the target pin's voltage
    callbacks.setComponentPinValue(targetCompId, targetPinId, value);

    // Update the target component's state based on its type
    const targetComp = components.find(c => c.id === targetCompId);
    if (!targetComp) continue;

    updateComponentFromPin(targetComp, targetPinId, value, callbacks);
  }
}

/**
 * Update a component's state based on a pin voltage change.
 * Different component types respond differently to voltage.
 */
function updateComponentFromPin(
  comp: PlacedComponent,
  pinId: string,
  value: number,
  callbacks: PinPropagationCallbacks,
): void {
  const isHigh = value > 2.5;

  switch (comp.defId) {
    // ─── LEDs ──────────────────────────────────────────────────────
    case 'led-red':
    case 'led-green':
    case 'led-blue':
    case 'led-yellow': {
      // LED turns on when anode has voltage
      if (pinId === 'anode') {
        callbacks.updateComponentState(comp.id, { ledOn: isHigh });
      }
      break;
    }

    // ─── RGB LED ───────────────────────────────────────────────────
    case 'rgb-led': {
      if (pinId === 'red') {
        const current = comp.state?.r ?? 0;
        const normalized = isHigh ? 1 : 0;
        if (current !== normalized) {
          callbacks.updateComponentState(comp.id, { r: normalized });
        }
      } else if (pinId === 'green') {
        const current = comp.state?.g ?? 0;
        const normalized = isHigh ? 1 : 0;
        if (current !== normalized) {
          callbacks.updateComponentState(comp.id, { g: normalized });
        }
      } else if (pinId === 'blue') {
        const current = comp.state?.b ?? 0;
        const normalized = isHigh ? 1 : 0;
        if (current !== normalized) {
          callbacks.updateComponentState(comp.id, { b: normalized });
        }
      }
      break;
    }

    // ─── Buzzer ────────────────────────────────────────────────────
    case 'buzzer': {
      if (pinId === 'pos') {
        callbacks.updateComponentState(comp.id, { buzzerOn: isHigh });
      }
      break;
    }

    // ─── Servo Motor ───────────────────────────────────────────────
    case 'servo-motor': {
      if (pinId === 'sig') {
        // For now, map HIGH/LOW to 0°/180° angle
        // A real implementation would measure PWM duty cycle
        callbacks.updateComponentState(comp.id, { angle: isHigh ? 180 : 0 });
      }
      break;
    }

    // ─── Push Button ───────────────────────────────────────────────
    // Buttons are input devices — they affect the MCU, not vice versa
    // (handled by setPinValue on the simulator)

    // ─── Passive components (resistor, potentiometer, photoresistor) ─
    // These don't have active state that changes with voltage in this sim

    // ─── Complex components (LCD, DHT22, Ultrasonic) ────────────────
    // These require I2C/SPI protocol handling — more complex
    // For now, they're passive in the simulation
  }
}

/**
 * Initialize all component pin states from the circuit.
 * Called when simulation starts to ensure all power pins are at correct voltage.
 */
export function initializeComponentPower(
  components: PlacedComponent[],
  wires: Wire[],
  callbacks: PinPropagationCallbacks,
): void {
  for (const comp of components) {
    // Set power and ground pins to their default values
    for (const pin of comp.pins) {
      if (pin.type === 'power') {
        callbacks.setComponentPinValue(comp.id, pin.id, 5);
      } else if (pin.type === 'ground') {
        callbacks.setComponentPinValue(comp.id, pin.id, 0);
      }
    }

    // Propagate power through wires
    for (const pin of comp.pins) {
      if (pin.type === 'power' || pin.type === 'ground') {
        const value = pin.type === 'power' ? 5 : 0;
        propagatePinChange(comp.id, pin.id, value, wires, components, callbacks);
      }
    }
  }
}
