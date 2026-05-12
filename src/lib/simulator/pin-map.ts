/**
 * Pin Mapping — Arduino UNO (ATmega328P) pin IDs to AVR port/bit
 *
 * PORTD: PD0-PD7 → Arduino D0-D7
 * PORTB: PB0-PB5 → Arduino D8-D13
 * PORTC: PC0-PC5 → Arduino A0-A5
 */

export interface PinMapping {
  /** Arduino pin ID used in component-defs (e.g., 'd13', 'a0') */
  arduinoPin: string;
  /** AVR port name ('B', 'C', 'D') */
  port: string;
  /** Bit index within the port (0-7) */
  bit: number;
  /** Whether this pin supports PWM */
  pwm: boolean;
}

export const ARDUINO_UNO_PIN_MAP: Record<string, PinMapping> = {
  // Digital pins via PORTD (D0-D7)
  d0:  { arduinoPin: 'd0',  port: 'D', bit: 0, pwm: false },
  d1:  { arduinoPin: 'd1',  port: 'D', bit: 1, pwm: false },
  d2:  { arduinoPin: 'd2',  port: 'D', bit: 2, pwm: false },
  d3:  { arduinoPin: 'd3',  port: 'D', bit: 3, pwm: true },
  d4:  { arduinoPin: 'd4',  port: 'D', bit: 4, pwm: false },
  d5:  { arduinoPin: 'd5',  port: 'D', bit: 5, pwm: true },
  d6:  { arduinoPin: 'd6',  port: 'D', bit: 6, pwm: true },
  d7:  { arduinoPin: 'd7',  port: 'D', bit: 7, pwm: false },

  // Digital pins via PORTB (D8-D13)
  d8:  { arduinoPin: 'd8',  port: 'B', bit: 0, pwm: false },
  d9:  { arduinoPin: 'd9',  port: 'B', bit: 1, pwm: true },
  d10: { arduinoPin: 'd10', port: 'B', bit: 2, pwm: true },
  d11: { arduinoPin: 'd11', port: 'B', bit: 3, pwm: true },
  d12: { arduinoPin: 'd12', port: 'B', bit: 4, pwm: false },
  d13: { arduinoPin: 'd13', port: 'B', bit: 5, pwm: false },

  // Analog pins via PORTC (A0-A5)
  a0: { arduinoPin: 'a0', port: 'C', bit: 0, pwm: false },
  a1: { arduinoPin: 'a1', port: 'C', bit: 1, pwm: false },
  a2: { arduinoPin: 'a2', port: 'C', bit: 2, pwm: false },
  a3: { arduinoPin: 'a3', port: 'C', bit: 3, pwm: false },
  a4: { arduinoPin: 'a4', port: 'C', bit: 4, pwm: false },
  a5: { arduinoPin: 'a5', port: 'C', bit: 5, pwm: false },
};

/** Reverse map: port+bit → arduino pin ID */
export const PORT_BIT_TO_ARDUINO: Record<string, string> = {};
for (const [key, mapping] of Object.entries(ARDUINO_UNO_PIN_MAP)) {
  PORT_BIT_TO_ARDUINO[`${mapping.port}${mapping.bit}`] = key;
}

/**
 * Get the pin mapping for a given board type
 * Currently only arduino-uno is supported, but this is extensible
 */
export function getPinMap(boardType: string): Record<string, PinMapping> {
  switch (boardType) {
    case 'arduino-uno':
    case 'arduino-nano':
      return ARDUINO_UNO_PIN_MAP;
    default:
      console.warn(`[pin-map] No pin map for board '${boardType}', falling back to Arduino UNO`);
      return ARDUINO_UNO_PIN_MAP;
  }
}
