/**
 * AVR Simulator — avr8js-based ATmega328P simulation engine
 *
 * Generic MCU simulator interface that wraps avr8js.
 * Architecture designed to be extensible for future MCUs (ESP32, RP2040, etc.)
 *
 * Current implementation: ATmega328P (Arduino UNO/Nano)
 */

import {
  CPU,
  AVRIOPort,
  portBConfig,
  portCConfig,
  portDConfig,
  AVRUSART,
  usart0Config,
  AVRTimer,
  timer0Config,
  timer1Config,
  timer2Config,
  AVRClock,
  clockConfig,
} from 'avr8js';
import { parseHex } from './hex-parser';
import { getPinMap, PORT_BIT_TO_ARDUINO } from './pin-map';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PinStateChange {
  pinId: string;      // Arduino pin ID (e.g., 'd13')
  value: number;      // 0 or 5 (voltage)
  mode: 'output' | 'input';
}

export interface MCUSimulator {
  /** Load compiled hex program into the simulator */
  load(hex: string): void;
  /** Run N CPU cycles */
  step(cycles: number): void;
  /** Stop the simulation */
  stop(): void;
  /** Get current value of an Arduino pin (0 = LOW, 5 = HIGH) */
  getPinValue(pinId: string): number;
  /** Set input value for an Arduino pin (for sensors/buttons) */
  setPinValue(pinId: string, high: boolean): void;
  /** Send a byte to serial (UART RX) */
  sendSerialByte(byte: number): void;
  /** Get current simulation time in microseconds */
  getMicroseconds(): number;
  /** Destroy the simulator and free resources */
  destroy(): void;
  /** Register a listener for GPIO pin changes */
  onPinChange(listener: (changes: PinStateChange[]) => void): () => void;
  /** Register a listener for UART serial output */
  onSerialTransmit(listener: (line: string) => void): () => void;
}

type PinChangeListener = (changes: PinStateChange[]) => void;
type SerialTransmitListener = (char: string) => void;

// ─── AVR Simulator Implementation ────────────────────────────────────────

export class AVRSimulator implements MCUSimulator {
  private cpu: CPU | null = null;
  private portB: AVRIOPort | null = null;
  private portC: AVRIOPort | null = null;
  private portD: AVRIOPort | null = null;
  private usart: AVRUSART | null = null;
  private timer0: AVRTimer | null = null;
  private timer1: AVRTimer | null = null;
  private timer2: AVRTimer | null = null;
  private clock: AVRClock | null = null;

  private pinListeners: PinChangeListener[] = [];
  private serialListeners: SerialTransmitListener[] = [];
  private serialLineBuffer = '';

  private pinValues: Record<string, number> = {};
  private pinModes: Record<string, 'output' | 'input'> = {};
  private portValues: Record<string, number> = { B: 0, C: 0, D: 0 };
  private portDDR: Record<string, number> = { B: 0, C: 0, D: 0 };

  private running = false;

  // ─── Load hex program ────────────────────────────────────────────────
  load(hex: string): void {
    // Clean up previous instance
    this.destroy();

    // Parse Intel HEX to program memory
    const progMem = parseHex(hex);

    // Create CPU with 2KB SRAM (ATmega328P)
    this.cpu = new CPU(progMem, 2048);

    // CPU clock frequency: 16MHz (Arduino UNO)
    const FREQ = 16_000_000;

    // Set up GPIO ports
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);

    // Listen for pin changes on all ports
    this.setupPortListener('B', this.portB);
    this.setupPortListener('C', this.portC);
    this.setupPortListener('D', this.portD);

    // Set up USART (Serial) at hardware 9600 baud (actual baud doesn't matter for sim)
    this.usart = new AVRUSART(this.cpu, usart0Config, FREQ);
    this.usart.onByteTransmit = (value: number) => {
      const char = String.fromCharCode(value);
      this.serialLineBuffer += char;
      if (char === '\n') {
        const line = this.serialLineBuffer;
        this.serialLineBuffer = '';
        // Notify all serial listeners
        for (const listener of this.serialListeners) {
          listener(line);
        }
      }
    };

    // Set up Timers (needed for delay(), millis(), micros(), PWM)
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);

    // Set up Clock (needed for millis())
    this.clock = new AVRClock(this.cpu, FREQ, clockConfig);

    this.running = true;
  }

  // ─── Run CPU cycles ──────────────────────────────────────────────────
  step(cycles: number): void {
    if (!this.cpu || !this.running) return;

    // Run in chunks to avoid blocking
    const CHUNK = 50000;
    let remaining = cycles;
    while (remaining > 0 && this.running) {
      const count = Math.min(remaining, CHUNK);
      for (let i = 0; i < count; i++) {
        this.cpu.tick();
      }
      remaining -= count;
    }
  }

  // ─── Stop simulation ─────────────────────────────────────────────────
  stop(): void {
    this.running = false;
  }

  // ─── Get pin value (0 = LOW, 5 = HIGH) ──────────────────────────────
  getPinValue(pinId: string): number {
    return this.pinValues[pinId] ?? 0;
  }

  // ─── Set pin input value (for external signals) ─────────────────────
  setPinValue(pinId: string, high: boolean): void {
    const pinMap = getPinMap('arduino-uno');
    const mapping = pinMap[pinId];
    if (!mapping) return;

    let port: AVRIOPort | null = null;
    switch (mapping.port) {
      case 'B': port = this.portB; break;
      case 'C': port = this.portC; break;
      case 'D': port = this.portD; break;
    }
    port?.setPin(mapping.bit, high);
  }

  // ─── Send byte to UART RX ───────────────────────────────────────────
  sendSerialByte(byte: number): void {
    if (this.usart && this.usart.rxEnable) {
      this.usart.writeByte(byte);
    }
  }

  // ─── Get simulation time ────────────────────────────────────────────
  getMicroseconds(): number {
    return this.clock?.timeMicros ?? 0;
  }

  // ─── Event listeners ────────────────────────────────────────────────
  onPinChange(listener: PinChangeListener): () => void {
    this.pinListeners.push(listener);
    return () => {
      this.pinListeners = this.pinListeners.filter(l => l !== listener);
    };
  }

  onSerialTransmit(listener: SerialTransmitListener): () => void {
    this.serialListeners.push(listener);
    return () => {
      this.serialListeners = this.serialListeners.filter(l => l !== listener);
    };
  }

  // ─── Cleanup ────────────────────────────────────────────────────────
  destroy(): void {
    this.running = false;
    this.cpu = null;
    this.portB = null;
    this.portC = null;
    this.portD = null;
    this.usart = null;
    this.timer0 = null;
    this.timer1 = null;
    this.timer2 = null;
    this.clock = null;
    this.pinValues = {};
    this.pinModes = {};
    this.portValues = { B: 0, C: 0, D: 0 };
    this.portDDR = { B: 0, C: 0, D: 0 };
    this.serialLineBuffer = '';
  }

  // ─── Private: Setup port change listener ────────────────────────────
  private setupPortListener(portName: string, port: AVRIOPort): void {
    port.addListener((value: number, oldValue: number) => {
      // Get the DDR for this port to know which pins are outputs
      let ddr: number;
      switch (portName) {
        case 'B': ddr = this.cpu!.readData(portBConfig.DDR); break;
        case 'C': ddr = this.cpu!.readData(portCConfig.DDR); break;
        case 'D': ddr = this.cpu!.readData(portDConfig.DDR); break;
        default: return;
      }

      this.portValues[portName] = value;
      this.portDDR[portName] = ddr;

      const changes: PinStateChange[] = [];

      // Check each bit (0-7)
      for (let bit = 0; bit < 8; bit++) {
        const bitMask = 1 << bit;
        const oldBit = (oldValue >> bit) & 1;
        const newBit = (value >> bit) & 1;

        // Only process changed bits
        if (oldBit === newBit) continue;

        // Find Arduino pin ID for this port+bit
        const arduinoPin = PORT_BIT_TO_ARDUINO[`${portName}${bit}`];
        if (!arduinoPin) continue;

        const isOutput = (ddr & bitMask) !== 0;
        const voltage = isOutput && newBit ? 5 : 0;

        this.pinValues[arduinoPin] = voltage;
        this.pinModes[arduinoPin] = isOutput ? 'output' : 'input';

        changes.push({
          pinId: arduinoPin,
          value: voltage,
          mode: isOutput ? 'output' : 'input',
        });
      }

      if (changes.length > 0) {
        for (const listener of this.pinListeners) {
          listener(changes);
        }
      }
    });
  }
}

// ─── Simulator Factory (Generic MCU abstraction) ──────────────────────

export type MCUType = 'avr' | 'esp32' | 'rp2040';

/**
 * Create a simulator for the given MCU type and board.
 * Currently only AVR (ATmega328P) is supported.
 * Future: ESP32, RP2040, STM32, etc.
 */
export function createSimulator(boardType: string): MCUSimulator {
  // Determine MCU type from board
  const boardMCUMap: Record<string, MCUType> = {
    'arduino-uno': 'avr',
    'arduino-nano': 'avr',
    'arduino-mega': 'avr',
    'attiny85': 'avr',
  };

  const mcuType = boardMCUMap[boardType] ?? 'avr';

  switch (mcuType) {
    case 'avr':
      return new AVRSimulator();
    default:
      console.warn(`[simulator] MCU type '${mcuType}' not yet supported, falling back to AVR`);
      return new AVRSimulator();
  }
}
