/**
 * RP2040 Simulation Bridge for Eesha Learn
 *
 * Provides a mock simulation of the Raspberry Pi Pico's RP2040 microcontroller,
 * emulating dual-core ARM Cortex-M0+ behavior, GPIO, UART, I2C, SPI, PWM,
 * and Programmable I/O (PIO) for MicroPython / CircuitPython code patterns.
 *
 * This is a client-side simulation — no real firmware is executed. Instead,
 * the loaded source code is pattern-matched to produce realistic pin states
 * and serial output that mirrors what would happen on real hardware.
 */

import type { PinState } from '@/types';
import type { SimulationBridge } from './simulation-bridge';

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const BOARD_ID = 'raspberry_pi_pico' as const;
const BOARD_NAME = 'Raspberry Pi Pico (RP2040)';
const LOGIC_HIGH_VOLTAGE = 3.3;
const LOGIC_LOW_VOLTAGE = 0;
const BUILTIN_LED_GPIO = 25;
const ADC_VREF_GPIO = 29;
const NUM_GPIO_PINS = 30; // GP0–GP29
const NUM_PWM_SLICES = 8; // each slice has channels A & B → 16 channels
const NUM_UARTS = 2;
const NUM_PIO_INSTANCES = 2;
const PIO_STATE_MACHINES_PER_INSTANCE = 4;
const MIN_SPEED = 0.25;
const MAX_SPEED = 8;

/** Minimum simulation tick interval in ms (prevents runaway timers). */
const MIN_TICK_MS = 8;

// ═══════════════════════════════════════════════════════════════════════════
//  PIN DEFINITIONS — matches real Pico GPIO layout
// ═══════════════════════════════════════════════════════════════════════════

interface PinDef {
  gpio: number;
  name: string;
  altFunctions: string[];
  adc?: number; // ADC channel (0-3) if applicable
  defaultFunc: string;
  isOnHeader: boolean;
}

/**
 * Official Raspberry Pi Pico GPIO pin definitions.
 *
 * GP23/GP24 are internal-only (flash / debug) on the original Pico and are
 * NOT broken out to the 40-pin header, but we include them so the simulator
 * can model the full GP0–GP29 range.
 */
const PICO_PINS: PinDef[] = [
  { gpio: 0,  name: 'GP0',  altFunctions: ['SPI0 RX', 'I2C0 SDA', 'UART0 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 1,  name: 'GP1',  altFunctions: ['SPI0 CSn', 'I2C0 SCL', 'UART0 RX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 2,  name: 'GP2',  altFunctions: ['SPI0 SCK', 'I2C1 SDA', 'UART0 CTS', 'PIO1'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 3,  name: 'GP3',  altFunctions: ['SPI0 TX', 'I2C1 SCL', 'UART0 RTS', 'PIO1'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 4,  name: 'GP4',  altFunctions: ['SPI0 RX', 'I2C0 SDA', 'UART1 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 5,  name: 'GP5',  altFunctions: ['SPI0 CSn', 'I2C0 SCL', 'UART1 RX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 6,  name: 'GP6',  altFunctions: ['SPI0 SCK', 'I2C1 SDA', 'UART1 CTS', 'PIO1'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 7,  name: 'GP7',  altFunctions: ['SPI0 TX', 'I2C1 SCL', 'UART1 RTS', 'PIO1'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 8,  name: 'GP8',  altFunctions: ['SPI1 RX', 'I2C0 SDA', 'UART1 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 9,  name: 'GP9',  altFunctions: ['SPI1 CSn', 'I2C0 SCL', 'UART1 RX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 10, name: 'GP10', altFunctions: ['SPI1 SCK', 'I2C1 SDA', 'UART1 CTS', 'PIO1'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 11, name: 'GP11', altFunctions: ['SPI1 TX', 'I2C1 SCL', 'UART1 RTS', 'PIO1'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 12, name: 'GP12', altFunctions: ['SPI0 RX', 'I2C0 SDA', 'UART0 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 13, name: 'GP13', altFunctions: ['SPI0 CSn', 'I2C0 SCL', 'UART0 RX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 14, name: 'GP14', altFunctions: ['SPI0 SCK', 'I2C0 SDA', 'UART0 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 15, name: 'GP15', altFunctions: ['SPI0 TX', 'I2C0 SCL', 'UART0 RX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 16, name: 'GP16', altFunctions: ['SPI0 RX', 'I2C0 SDA', 'UART0 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 17, name: 'GP17', altFunctions: ['SPI0 CSn', 'I2C0 SCL', 'UART0 RX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 18, name: 'GP18', altFunctions: ['SPI0 SCK', 'I2C0 SDA', 'UART0 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 19, name: 'GP19', altFunctions: ['SPI0 TX', 'I2C0 SCL', 'UART0 RX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 20, name: 'GP20', altFunctions: ['SPI0 SCK', 'I2C0 SDA', 'UART0 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 21, name: 'GP21', altFunctions: ['SPI0 TX', 'I2C0 SCL', 'UART0 RX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  { gpio: 22, name: 'GP22', altFunctions: ['SPI0 RX', 'I2C0 SDA', 'UART0 TX', 'PIO0'], defaultFunc: 'GPIO', isOnHeader: true },
  // GP23 & GP24 — not on the standard header (flash SPI / debug), included for completeness
  { gpio: 23, name: 'GP23', altFunctions: ['Internal'], defaultFunc: 'GPIO', isOnHeader: false },
  { gpio: 24, name: 'GP24', altFunctions: ['Internal'], defaultFunc: 'GPIO', isOnHeader: false },
  // Built-in LED
  { gpio: 25, name: 'GP25', altFunctions: ['LED', 'PWM', 'PIO'], defaultFunc: 'LED', isOnHeader: true },
  // ADC-capable GPIO
  { gpio: 26, name: 'GP26', altFunctions: ['ADC0', 'PWM', 'PIO0'], adc: 0, defaultFunc: 'ADC', isOnHeader: true },
  { gpio: 27, name: 'GP27', altFunctions: ['ADC1', 'PWM', 'PIO0'], adc: 1, defaultFunc: 'ADC', isOnHeader: true },
  { gpio: 28, name: 'GP28', altFunctions: ['ADC2', 'PWM', 'PIO0'], adc: 2, defaultFunc: 'ADC', isOnHeader: true },
  // VSYS / 3 measurement (read-only)
  { gpio: 29, name: 'GP29', altFunctions: ['ADC_VREF', 'ADC3'], adc: 3, defaultFunc: 'ADC_VREF', isOnHeader: true },
];

// ═══════════════════════════════════════════════════════════════════════════
//  SUPPORTING TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Internal pin state with richer metadata than `PinState`. */
interface InternalPinState extends PinState {
  mode: 'input' | 'output' | 'alt' | 'disabled';
  altFunction?: string;
  pull?: 'up' | 'down' | 'none';
  debounceMs?: number;
  isrAttached?: boolean;
}

/** PWM slice + channel assignment. */
interface PWMChannelAssignment {
  slice: number;
  channel: 'A' | 'B';
  enabled: boolean;
  frequencyHz: number;
  dutyCycle: number; // 0.0 – 1.0
  gpio: number;
}

/** UART configuration & state. */
interface UARTState {
  instance: 0 | 1;
  enabled: boolean;
  baudRate: number;
  txPin: number | null;
  rxPin: number | null;
  txBuffer: string;
  rxBuffer: string;
}

/** I²C bus configuration & state. */
interface I2CState {
  instance: 0 | 1;
  enabled: boolean;
  frequencyHz: number;
  sdaPin: number | null;
  sclPin: number | null;
  /** Mock devices on the bus. Key = 7-bit address, value = mock device name. */
  devices: Map<number, string>;
  /** Queue of bytes received from mock devices. */
  rxQueue: number[];
}

/** SPI bus configuration & state. */
interface SPIState {
  instance: 0 | 1;
  enabled: boolean;
  frequencyHz: number;
  sckPin: number | null;
  mosiPin: number | null;
  misoPin: number | null;
  csPins: number[];
  /** Simulated MISO response bytes (loopback). */
  misoBuffer: number[];
}

/** Per-core execution state. */
interface CoreState {
  id: 0 | 1;
  active: boolean;
  frequencyHz: number; // base clock (133 MHz)
  currentPC: number;
  cycleCount: number;
}

/** Per-state-machine PIO state. */
interface PIOStateMachine {
  id: number;
  pioInstance: 0 | 1;
  program: string | null;
  running: boolean;
  wrapTarget: number;
  wrap: number;
  pinCount: number;
  inPins: number[];
  outPins: number;
  sideSetPins: number;
  frequencyHz: number;
}

/** ADC channel state. */
interface ADCChannelState {
  channel: number;
  gpio: number;
  enabled: boolean;
  valueRaw: number; // 0 – 4095 (12-bit)
  voltage: number;
}

/** Describes the language / framework the loaded code targets. */
type CodeLanguage = 'micropython' | 'circuitpython' | 'c' | 'cpp' | 'unknown';

// ═══════════════════════════════════════════════════════════════════════════
//  RP2040Simulation CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class RP2040Simulation implements SimulationBridge {
  // ── General simulation state ──────────────────────────────────────────
  private running = false;
  private speed = 1;
  private compiledCode: string | null = null;
  private codeLanguage: CodeLanguage = 'unknown';
  private timerId: ReturnType<typeof setInterval> | null = null;
  private stepCounter = 0;
  private startTimeMs = 0;

  // ── Pin states (GP0 – GP29) ─────────────────────────────────────────
  private pins: InternalPinState[] = [];

  // ── Dual-core ────────────────────────────────────────────────────────
  private cores: [CoreState, CoreState] = [
    { id: 0, active: true, frequencyHz: 133_000_000, currentPC: 0, cycleCount: 0 },
    { id: 1, active: false, frequencyHz: 133_000_000, currentPC: 0, cycleCount: 0 },
  ];

  // ── PWM ──────────────────────────────────────────────────────────────
  /**
   * Index = GPIO number.  Value is the PWM channel assignment for that GPIO,
   * or `null` if the GPIO is not configured for PWM.
   */
  private pwmAssignments: (PWMChannelAssignment | null)[];

  // ── UART (0 and 1) ──────────────────────────────────────────────────
  private uarts: [UARTState, UARTState];

  // ── I²C (0 and 1) ──────────────────────────────────────────────────
  private i2cBuses: [I2CState, I2CState];

  // ── SPI (0 and 1) ──────────────────────────────────────────────────
  private spiBuses: [SPIState, SPIState];

  // ── PIO ─────────────────────────────────────────────────────────────
  private pioStateMachines: PIOStateMachine[];

  // ── ADC ──────────────────────────────────────────────────────────────
  private adcChannels: ADCChannelState[];

  // ── Callbacks (same shape as SimulationBridge) ───────────────────────
  private pinChangeCallbacks: ((componentId: string, pinStates: PinState[]) => void)[] = [];
  private serialCallbacks: ((line: string) => void)[] = [];
  private errorCallbacks: ((error: string) => void)[] = [];
  private serialBuffer: string[] = [];

  // ── Button simulation state ──────────────────────────────────────────
  private simulatedButtons: Map<number, { gpio: number; pressed: boolean; debounceUntil: number }> = new Map();

  // ── Servo state ─────────────────────────────────────────────────────
  private servoAngles: Map<number, number> = new Map(); // gpio → angle (0–180)

  // ─────────────────────────────────────────────────────────────────────
  //  CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────

  constructor() {
    this.pins = this.createDefaultPins();
    this.pwmAssignments = new Array(NUM_GPIO_PINS).fill(null);
    this.uarts = this.createDefaultUARTs();
    this.i2cBuses = this.createDefaultI2C();
    this.spiBuses = this.createDefaultSPI();
    this.pioStateMachines = this.createDefaultPIO();
    this.adcChannels = this.createDefaultADC();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PUBLIC API — SimulationBridge interface
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Load source code for simulation.
   *
   * Accepts MicroPython, CircuitPython, C, or C++ source.  The code is
   * *not* compiled or executed — it is pattern-matched at simulation time
   * to produce realistic mock behavior.
   */
  async loadCode(code: string): Promise<void> {
    this.compiledCode = code;
    this.codeLanguage = this.detectLanguage(code);

    // Reset all peripheral state before loading new code
    this.resetPinStates();
    this.pwmAssignments.fill(null);
    this.uarts = this.createDefaultUARTs();
    this.i2cBuses = this.createDefaultI2C();
    this.spiBuses = this.createDefaultSPI();
    this.pioStateMachines = this.createDefaultPIO();
    this.adcChannels = this.createDefaultADC();
    this.simulatedButtons.clear();
    this.servoAngles.clear();

    // Pre-configure peripherals based on code patterns
    this.preConfigureFromCode(code);

    // Notify listeners of the fresh pin state
    this.emitPinChange();
  }

  /** Start the simulation loop. */
  start(): void {
    if (this.running) return;
    if (!this.compiledCode) {
      this.emitError('No code loaded. Call loadCode() before start().');
      return;
    }

    this.running = true;
    this.stepCounter = 0;
    this.startTimeMs = Date.now();
    this.serialBuffer = [];
    this.cores[0].active = true;
    this.runSimulationLoop();
  }

  /** Stop the simulation loop. */
  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /** Full reset — stops simulation and restores defaults. */
  reset(): void {
    this.stop();
    this.stepCounter = 0;
    this.serialBuffer = [];
    this.startTimeMs = 0;

    // Reset cores
    this.cores[0] = { id: 0, active: true, frequencyHz: 133_000_000, currentPC: 0, cycleCount: 0 };
    this.cores[1] = { id: 1, active: false, frequencyHz: 133_000_000, currentPC: 0, cycleCount: 0 };

    this.resetPinStates();
    this.pwmAssignments.fill(null);
    this.uarts = this.createDefaultUARTs();
    this.i2cBuses = this.createDefaultI2C();
    this.spiBuses = this.createDefaultSPI();
    this.pioStateMachines = this.createDefaultPIO();
    this.adcChannels = this.createDefaultADC();
    this.simulatedButtons.clear();
    this.servoAngles.clear();

    if (this.compiledCode) {
      this.preConfigureFromCode(this.compiledCode);
    }

    this.emitPinChange();
  }

  /**
   * Set the simulation speed multiplier.
   *
   * Clamped to the range [0.25, 8].
   */
  setSpeed(speed: number): void {
    this.speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
    if (this.running) {
      // Restart the loop so the new interval takes effect
      this.stop();
      this.running = true;
      this.runSimulationLoop();
    }
  }

  /**
   * Return the current board-level pin state, compatible with
   * `SimulationBridge.getState()`.
   */
  getState(): Record<string, PinState[]> {
    return {
      [BOARD_ID]: this.pins.map((p) => this.toExternalPinState(p)),
    };
  }

  /** Register a callback invoked whenever pin states change. */
  onPinChange(callback: (componentId: string, pinStates: PinState[]) => void): void {
    this.pinChangeCallbacks.push(callback);
  }

  /** Register a callback invoked for each line of serial output. */
  onSerialOutput(callback: (line: string) => void): void {
    this.serialCallbacks.push(callback);
  }

  /** Register a callback invoked on simulation errors. */
  onError(callback: (error: string) => void): void {
    this.errorCallbacks.push(callback);
  }

  /** Return all serial output accumulated since the last start/reset. */
  getSerialOutput(): string[] {
    return [...this.serialBuffer];
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PUBLIC API — RP2040-specific accessors
  // ═══════════════════════════════════════════════════════════════════════

  /** Read the raw value of a specific GPIO (0–29). */
  getPin(gpio: number): InternalPinState | undefined {
    return this.pins[gpio];
  }

  /** Return all 30 internal pin states. */
  getAllPins(): InternalPinState[] {
    return [...this.pins];
  }

  /** Check whether the simulation is currently running. */
  isRunning(): boolean {
    return this.running;
  }

  /** Get the current speed multiplier. */
  getSpeed(): number {
    return this.speed;
  }

  /** Get the detected code language. */
  getLanguage(): CodeLanguage {
    return this.codeLanguage;
  }

  /** Get per-core state. */
  getCoreStates(): [CoreState, CoreState] {
    return this.cores;
  }

  /** Check if Core 1 is active (e.g. `_thread` started in MicroPython). */
  isSecondCoreActive(): boolean {
    return this.cores[1].active;
  }

  /** Get PWM assignments for all GPIOs. */
  getPWMAssignments(): (PWMChannelAssignment | null)[] {
    return [...this.pwmAssignments];
  }

  /** Get UART states. */
  getUARTStates(): [UARTState, UARTState] {
    return this.uarts;
  }

  /** Get I²C bus states. */
  getI2CStates(): [I2CState, I2CState] {
    return this.i2cBuses;
  }

  /** Get SPI bus states. */
  getSPIStates(): [SPIState, SPIState] {
    return this.spiBuses;
  }

  /** Get all PIO state machines. */
  getPIOStateMachines(): PIOStateMachine[] {
    return [...this.pioStateMachines];
  }

  /** Get ADC channel states. */
  getADCChannels(): ADCChannelState[] {
    return [...this.adcChannels];
  }

  // ── Interactive pin manipulation (for UI buttons, etc.) ─────────────

  /** Simulate pressing a button on the given GPIO. */
  pressButton(gpio: number): void {
    const pin = this.pins[gpio];
    if (!pin) return;
    pin.value = 'low';
    pin.voltage = LOGIC_LOW_VOLTAGE;
    this.simulatedButtons.set(gpio, { gpio, pressed: true, debounceUntil: Date.now() + 50 });
    this.emitPinChange();
  }

  /** Simulate releasing a button on the given GPIO. */
  releaseButton(gpio: number): void {
    const pin = this.pins[gpio];
    if (!pin) return;
    const btn = this.simulatedButtons.get(gpio);
    if (btn) {
      btn.pressed = false;
      btn.debounceUntil = Date.now() + 50;
    }
    pin.value = pin.pull === 'up' ? 'high' : 'low';
    pin.voltage = pin.value === 'high' ? LOGIC_HIGH_VOLTAGE : LOGIC_LOW_VOLTAGE;
    this.emitPinChange();
  }

  /** Simulate an analog reading on an ADC-capable GPIO (e.g. for potentiometer). */
  setAnalogValue(gpio: number, raw: number): void {
    const ch = this.adcChannels.find((c) => c.gpio === gpio);
    if (!ch) return;
    ch.valueRaw = Math.max(0, Math.min(4095, raw));
    ch.voltage = (ch.valueRaw / 4095) * 3.3;
    const pin = this.pins[gpio];
    if (pin) {
      pin.voltage = ch.voltage;
    }
  }

  /** Get the current servo angle for a GPIO, if configured. */
  getServoAngle(gpio: number): number | undefined {
    return this.servoAngles.get(gpio);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PRIVATE — Initialization helpers
  // ═══════════════════════════════════════════════════════════════════════

  private createDefaultPins(): InternalPinState[] {
    return PICO_PINS.map((def) => ({
      pinNumber: def.gpio,
      pinName: def.name,
      value: 'floating' as const,
      voltage: 0,
      current: 0,
      mode: 'input' as const,
      altFunction: undefined,
      pull: 'none' as const,
    }));
  }

  private resetPinStates(): void {
    this.pins = this.createDefaultPins();
  }

  private createDefaultUARTs(): [UARTState, UARTState] {
    return [
      { instance: 0, enabled: false, baudRate: 115200, txPin: null, rxPin: null, txBuffer: '', rxBuffer: '' },
      { instance: 1, enabled: false, baudRate: 115200, txPin: null, rxPin: null, txBuffer: '', rxBuffer: '' },
    ];
  }

  private createDefaultI2C(): [I2CState, I2CState] {
    return [
      { instance: 0, enabled: false, frequencyHz: 100_000, sdaPin: null, sclPin: null, devices: new Map(), rxQueue: [] },
      { instance: 1, enabled: false, frequencyHz: 100_000, sdaPin: null, sclPin: null, devices: new Map(), rxQueue: [] },
    ];
  }

  private createDefaultSPI(): [SPIState, SPIState] {
    return [
      { instance: 0, enabled: false, frequencyHz: 1_000_000, sckPin: null, mosiPin: null, misoPin: null, csPins: [], misoBuffer: [] },
      { instance: 1, enabled: false, frequencyHz: 1_000_000, sckPin: null, mosiPin: null, misoPin: null, csPins: [], misoBuffer: [] },
    ];
  }

  private createDefaultPIO(): PIOStateMachine[] {
    const sms: PIOStateMachine[] = [];
    for (let pio = 0; pio < NUM_PIO_INSTANCES; pio++) {
      for (let sm = 0; sm < PIO_STATE_MACHINES_PER_INSTANCE; sm++) {
        sms.push({
          id: sm,
          pioInstance: pio as 0 | 1,
          program: null,
          running: false,
          wrapTarget: 0,
          wrap: 31,
          pinCount: 0,
          inPins: [],
          outPins: 0,
          sideSetPins: 0,
          frequencyHz: 0,
        });
      }
    }
    return sms;
  }

  private createDefaultADC(): ADCChannelState[] {
    return [
      { channel: 0, gpio: 26, enabled: false, valueRaw: 0, voltage: 0 },
      { channel: 1, gpio: 27, enabled: false, valueRaw: 0, voltage: 0 },
      { channel: 2, gpio: 28, enabled: false, valueRaw: 0, voltage: 0 },
      { channel: 3, gpio: 29, enabled: true, valueRaw: Math.round((3.3 / 3) / 3.3 * 4095), voltage: 3.3 / 3 },
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PRIVATE — Code analysis & pre-configuration
  // ═══════════════════════════════════════════════════════════════════════

  private detectLanguage(code: string): CodeLanguage {
    const lower = code.toLowerCase();
    if (lower.includes('from machine import') || lower.includes('import machine')) return 'micropython';
    if (lower.includes('import board') || lower.includes('import digitalio') || lower.includes('import adafruit_')) return 'circuitpython';
    if (lower.includes('#include') && (lower.includes('pico.h') || lower.includes('hardware/gpio'))) return 'c';
    if (lower.includes('#include')) return 'cpp';
    return 'unknown';
  }

  /**
   * Scan the loaded code for peripheral initialization patterns and
   * pre-configure the simulation state accordingly.
   */
  private preConfigureFromCode(code: string): void {
    const c = code;

    // ── LED on GP25 ────────────────────────────────────────────────────
    const hasLedPattern =
      /Pin\(25\s*,\s*Pin\.OUT\)/i.test(c) ||
      c.includes('machine.Pin(25') ||
      c.includes('machine.LED(') ||
      c.includes('led = Pin(25') ||
      c.includes("led = Pin('LED'") ||
      c.includes("led = Pin(25, Pin.OUT)") ||
      c.includes("Pin(25, mode=Pin.OUT)");

    if (hasLedPattern) {
      this.setPinMode(BUILTIN_LED_GPIO, 'output', 'LED');
    }

    // ── UART ───────────────────────────────────────────────────────────
    // MicroPython: uart = UART(0, baudrate=115200, tx=Pin(0), rx=Pin(1))
    const uart0Match = c.match(/UART\s*\(\s*0\s*[\s\S]*?tx\s*=\s*Pin\s*\(\s*(\d+)\s*\)[\s\S]*?rx\s*=\s*Pin\s*\(\s*(\d+)\s*\)/);
    const uart1Match = c.match(/UART\s*\(\s*1\s*[\s\S]*?tx\s*=\s*Pin\s*\(\s*(\d+)\s*\)[\s\S]*?rx\s*=\s*Pin\s*\(\s*(\d+)\s*\)/);

    if (uart0Match) {
      this.configureUART(0, parseInt(uart0Match[1], 10), parseInt(uart0Match[2], 10));
    } else if (c.includes('UART(0') || c.includes('serial = UART(0')) {
      this.configureUART(0, 0, 1); // default Pico UART0 pins
    }

    if (uart1Match) {
      this.configureUART(1, parseInt(uart1Match[1], 10), parseInt(uart1Match[2], 10));
    } else if (c.includes('UART(1')) {
      this.configureUART(1, 4, 5); // default Pico UART1 pins
    }

    // CircuitPython: busio.UART(board.GP0, board.GP1, baudrate=115200)
    const cpUartMatch = c.match(/UART\s*\(\s*board\.GP(\d+)\s*,\s*board\.GP(\d+)/);
    if (cpUartMatch && this.codeLanguage === 'circuitpython') {
      this.configureUART(0, parseInt(cpUartMatch[1], 10), parseInt(cpUartMatch[2], 10));
    }

    // ── I²C ────────────────────────────────────────────────────────────
    // MicroPython: i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=400_000)
    const i2c0Match = c.match(/I2C\s*\(\s*0\s*[\s\S]*?sda\s*=\s*Pin\s*\(\s*(\d+)\s*\)[\s\S]*?scl\s*=\s*Pin\s*\(\s*(\d+)\s*\)/);
    const i2c1Match = c.match(/I2C\s*\(\s*1\s*[\s\S]*?sda\s*=\s*Pin\s*\(\s*(\d+)\s*\)[\s\S]*?scl\s*=\s*Pin\s*\(\s*(\d+)\s*\)/);

    if (i2c0Match) {
      this.configureI2C(0, parseInt(i2c0Match[1], 10), parseInt(i2c0Match[2], 10));
    } else if (c.includes('I2C(0')) {
      this.configureI2C(0, 0, 1);
    }
    if (i2c1Match) {
      this.configureI2C(1, parseInt(i2c1Match[1], 10), parseInt(i2c1Match[2], 10));
    } else if (c.includes('I2C(1')) {
      this.configureI2C(1, 2, 3);
    }

    // CircuitPython: busio.I2C(board.GP0, board.GP1)
    const cpI2cMatch = c.match(/I2C\s*\(\s*board\.GP(\d+)\s*,\s*board\.GP(\d+)/);
    if (cpI2cMatch && this.codeLanguage === 'circuitpython') {
      this.configureI2C(0, parseInt(cpI2cMatch[1], 10), parseInt(cpI2cMatch[2], 10));
    }

    // ── SPI ────────────────────────────────────────────────────────────
    // MicroPython: spi = SPI(0, sck=Pin(2), mosi=Pin(3), miso=Pin(4))
    const spi0Match = c.match(/SPI\s*\(\s*0\s*[\s\S]*?sck\s*=\s*Pin\s*\(\s*(\d+)\s*\)/);
    if (spi0Match) {
      const sck = parseInt(spi0Match[1], 10);
      const mosiMatch = c.match(/SPI\s*\(\s*0\s*[\s\S]*?mosi\s*=\s*Pin\s*\(\s*(\d+)\s*\)/);
      const misoMatch = c.match(/SPI\s*\(\s*0\s*[\s\S]*?miso\s*=\s*Pin\s*\(\s*(\d+)\s*\)/);
      this.configureSPI(0, sck, mosiMatch ? parseInt(mosiMatch[1], 10) : null, misoMatch ? parseInt(misoMatch[1], 10) : null);
    } else if (c.includes('SPI(0')) {
      this.configureSPI(0, 2, 3, 4);
    }

    // ── PWM ────────────────────────────────────────────────────────────
    this.detectPWMConfig(c);

    // ── ADC ────────────────────────────────────────────────────────────
    this.detectADCConfig(c);

    // ── Button with pull-up ────────────────────────────────────────────
    this.detectButtonConfig(c);

    // ── PIO ────────────────────────────────────────────────────────────
    this.detectPIOConfig(c);

    // ── Servo ──────────────────────────────────────────────────────────
    this.detectServoConfig(c);

    // ── Second core ────────────────────────────────────────────────────
    if (c.includes('_thread.start_new_thread') || c.includes('multicore.launch')) {
      this.cores[1].active = true;
    }
  }

  // ── Peripheral configuration helpers ─────────────────────────────────

  private configureUART(instance: 0 | 1, txPin: number, rxPin: number): void {
    const baudMatch = this.compiledCode?.match(/baudrate\s*=\s*(\d+)/);
    const baud = baudMatch ? parseInt(baudMatch[1], 10) : 115200;

    this.uarts[instance] = {
      ...this.uarts[instance],
      enabled: true,
      baudRate: baud,
      txPin,
      rxPin,
    };
    this.setPinMode(txPin, 'alt', 'UART TX');
    this.setPinMode(rxPin, 'alt', 'UART RX');
  }

  private configureI2C(instance: 0 | 1, sdaPin: number, sclPin: number): void {
    const freqMatch = this.compiledCode?.match(/freq\s*=\s*([\d_]+)/);
    const freq = freqMatch ? parseInt(freqMatch[1].replace(/_/g, ''), 10) : 100_000;

    const bus = this.i2cBuses[instance];
    bus.enabled = true;
    bus.frequencyHz = freq;
    bus.sdaPin = sdaPin;
    bus.sclPin = sclPin;

    // Seed some common mock I²C devices
    bus.devices.set(0x3c, 'SSD1306 OLED');
    bus.devices.set(0x68, 'MPU-6050 Accelerometer/Gyro');
    bus.devices.set(0x50, 'AT24C32 EEPROM');
    bus.devices.set(0x76, 'BME280 Sensor');
    bus.devices.set(0x48, 'ADS1115 ADC');
    bus.devices.set(0x1a, 'INA219 Current Sensor');
    bus.devices.set(0x5a, 'MLX90614 IR Thermometer');

    this.setPinMode(sdaPin, 'alt', 'I2C SDA');
    this.setPinMode(sclPin, 'alt', 'I2C SCL');
  }

  private configureSPI(
    instance: 0 | 1,
    sckPin: number,
    mosiPin: number | null,
    misoPin: number | null,
  ): void {
    const bus = this.spiBuses[instance];
    bus.enabled = true;
    bus.sckPin = sckPin;
    bus.mosiPin = mosiPin;
    bus.misoPin = misoPin;

    this.setPinMode(sckPin, 'alt', 'SPI SCK');
    if (mosiPin !== null) this.setPinMode(mosiPin, 'alt', 'SPI MOSI');
    if (misoPin !== null) this.setPinMode(misoPin, 'alt', 'SPI MISO');
  }

  private detectPWMConfig(code: string): void {
    // MicroPython: pwm = PWM(Pin(N)); pwm.freq(1000); pwm.duty_u16(32768)
    // CircuitPython: pwmio.PWMOut(board.GP25, frequency=1000, duty_cycle=32768)
    const mpMatch = code.matchAll(/PWM\s*\(\s*Pin\s*\(\s*(\d+)\s*\)\s*\)/g);
    const cpMatch = code.matchAll(/PWMOut\s*\(\s*board\.GP(\d+)/g);

    for (const m of mpMatch) {
      const gpio = parseInt(m[1], 10);
      this.assignPWM(gpio, 1000, 0.5);
    }
    for (const m of cpMatch) {
      const gpio = parseInt(m[1], 10);
      this.assignPWM(gpio, 1000, 0.5);
    }

    // Check for freq/duty overrides
    const freqMatch = code.match(/\.freq\s*\(\s*(\d+)\s*\)/);
    if (freqMatch) {
      const freq = parseInt(freqMatch[1], 10);
      this.pwmAssignments.forEach((pwm) => {
        if (pwm && pwm.enabled) pwm.frequencyHz = freq;
      });
    }
  }

  private assignPWM(gpio: number, frequencyHz: number, dutyCycle: number): void {
    // Default slice assignment: GPIO N → Slice (N >> 1), Channel A if even, B if odd
    const slice = Math.min(Math.floor(gpio / 2), NUM_PWM_SLICES - 1);
    const channel: 'A' | 'B' = gpio % 2 === 0 ? 'A' : 'B';

    this.pwmAssignments[gpio] = {
      slice,
      channel,
      enabled: true,
      frequencyHz,
      dutyCycle,
      gpio,
    };
    this.setPinMode(gpio, 'alt', `PWM Slice${slice} ${channel}`);
  }

  private detectADCConfig(code: string): void {
    // MicroPython: adc = ADC(Pin(26))
    const mpAdc = code.matchAll(/ADC\s*\(\s*Pin\s*\(\s*(\d+)\s*\)\s*\)/g);
    for (const m of mpAdc) {
      const gpio = parseInt(m[1], 10);
      const ch = this.adcChannels.find((c) => c.gpio === gpio);
      if (ch) {
        ch.enabled = true;
        this.setPinMode(gpio, 'alt', `ADC${ch.channel}`);
      }
    }

    // CircuitPython: analogio.AnalogIn(board.GP26)
    const cpAdc = code.matchAll(/AnalogIn\s*\(\s*board\.GP(\d+)/g);
    for (const m of cpAdc) {
      const gpio = parseInt(m[1], 10);
      const ch = this.adcChannels.find((c) => c.gpio === gpio);
      if (ch) {
        ch.enabled = true;
        this.setPinMode(gpio, 'alt', `ADC${ch.channel}`);
      }
    }
  }

  private detectButtonConfig(code: string): void {
    // MicroPython: button = Pin(N, Pin.IN, Pin.PULL_UP)
    const btnMatch = code.matchAll(/Pin\s*\(\s*(\d+)\s*,\s*Pin\.IN\s*,\s*Pin\.PULL_UP\)/g);
    for (const m of btnMatch) {
      const gpio = parseInt(m[1], 10);
      this.setPinMode(gpio, 'input', undefined, 'up');
      this.simulatedButtons.set(gpio, { gpio, pressed: false, debounceUntil: 0 });
    }

    // CircuitPython: digitalio.Direction.INPUT with pull
    if (code.includes('digitalio') && code.includes('Pull.UP')) {
      // Best-effort: look for GP references
      const gpMatch = code.matchAll(/board\.GP(\d+)/g);
      for (const m of gpMatch) {
        const gpio = parseInt(m[1], 10);
        if (!this.simulatedButtons.has(gpio)) {
          this.setPinMode(gpio, 'input', undefined, 'up');
          this.simulatedButtons.set(gpio, { gpio, pressed: false, debounceUntil: 0 });
        }
      }
    }
  }

  private detectPIOConfig(code: string): void {
    // MicroPython: rp2.PIO(0) or machine.PIO
    if (code.includes('rp2.PIO') || code.includes('@rp2.asm_pio') || code.includes('StateMachine')) {
      // Assign PIO0 state machine 0
      const sm = this.pioStateMachines[0];
      sm.program = 'loaded';
      sm.running = true;
      sm.frequencyHz = 125_000_000;
      sm.pinCount = 1;
      sm.inPins = [0];
      sm.outPins = 1;
    }
  }

  private detectServoConfig(code: string): void {
    // Common MicroPython servo patterns
    const servoMatch = code.matchAll(/servo\s*=\s*Servo\s*\(\s*Pin\s*\(\s*(\d+)\s*\)\s*\)/g);
    for (const m of servoMatch) {
      const gpio = parseInt(m[1], 10);
      this.servoAngles.set(gpio, 90); // default center
      this.assignPWM(gpio, 50, 0.075); // 50 Hz, 7.5 % duty = center
      this.setPinMode(gpio, 'alt', 'Servo PWM');
    }
  }

  private setPinMode(gpio: number, mode: InternalPinState['mode'], altFunction?: string, pull?: 'up' | 'down' | 'none'): void {
    const pin = this.pins[gpio];
    if (!pin) return;
    pin.mode = mode;
    pin.altFunction = altFunction;
    if (pull !== undefined) pin.pull = pull;
    if (mode === 'output') {
      pin.value = 'low';
      pin.voltage = LOGIC_LOW_VOLTAGE;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PRIVATE — Simulation loop
  // ═══════════════════════════════════════════════════════════════════════

  private runSimulationLoop(): void {
    if (!this.running || !this.compiledCode) return;

    const code = this.compiledCode;
    const interval = Math.max(MIN_TICK_MS, Math.round(200 / this.speed));

    this.timerId = setInterval(() => {
      if (!this.running) {
        if (this.timerId !== null) clearInterval(this.timerId);
        return;
      }

      this.stepCounter++;

      // Advance core cycle counters
      const cyclesPerTick = Math.round(133_000_000 * (interval / 1000) * this.speed);
      this.cores[0].cycleCount += cyclesPerTick;
      if (this.cores[1].active) {
        this.cores[1].cycleCount += cyclesPerTick;
      }

      // Run pattern-based mock simulations
      this.simulateBlink(code);
      this.simulatePWM(code);
      this.simulateSerial(code);
      this.simulateI2CScan(code);
      this.simulateADCReading(code);
      this.simulateServoSweep(code);
      this.simulatePIO(code);
      this.simulateButtonPolling(code);
      this.simulateSPITransfer(code);

      // Notify pin-change listeners
      this.emitPinChange();
    }, interval);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PRIVATE — Mock simulations for common code patterns
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * LED blink on the built-in LED (GP25).
   *
   * Detects:
   *   - MicroPython: `led.toggle()`, `led.value(not led.value())`, `led.on()`/`led.off()`
   *   - CircuitPython: `led.value = True/False`
   */
  private simulateBlink(code: string): void {
    const led = this.pins[BUILTIN_LED_GPIO];
    if (!led || led.mode !== 'output') return;

    const period = 60 / this.speed;
    const isHigh = Math.floor(this.stepCounter / period) % 2 === 0;

    if (code.includes('led.toggle()') || code.includes('led.value(not') || code.includes('led.value = True')) {
      led.value = isHigh ? 'high' : 'low';
      led.voltage = isHigh ? LOGIC_HIGH_VOLTAGE : LOGIC_LOW_VOLTAGE;
      led.current = isHigh ? 12 : 0; // ~12 mA for the on-board LED
    }

    // Button-controlled LED pattern
    if (code.includes('if not button') && code.includes('led')) {
      const anyButton = this.getAnyButtonState();
      if (anyButton !== null) {
        led.value = anyButton ? 'high' : 'low';
        led.voltage = anyButton ? LOGIC_HIGH_VOLTAGE : LOGIC_LOW_VOLTAGE;
        led.current = anyButton ? 12 : 0;
      }
    }
  }

  /**
   * PWM output simulation.
   *
   * Produces oscillating voltage on pins configured for PWM.  The mock
   * generates a pseudo-analog voltage based on the duty cycle.
   */
  private simulatePWM(code: string): void {
    this.pwmAssignments.forEach((pwm, gpio) => {
      if (!pwm || !pwm.enabled) return;

      const pin = this.pins[gpio];
      if (!pin) return;

      // Check for duty cycle changes in code patterns
      const dutyMatch = code.match(/\.duty_u16\s*\(\s*(\d+)\s*\)/);
      if (dutyMatch) {
        const raw = parseInt(dutyMatch[1], 10);
        pwm.dutyCycle = raw / 65535;
      }

      // Simulate the average voltage from PWM (for display purposes)
      // We oscillate between high and low to simulate the PWM waveform
      const phase = (this.stepCounter * this.speed * pwm.frequencyHz / 100) % 1;
      const isHigh = phase < pwm.dutyCycle;

      if (isHigh) {
        pin.value = 'high';
        pin.voltage = LOGIC_HIGH_VOLTAGE;
      } else {
        pin.value = 'low';
        pin.voltage = LOGIC_LOW_VOLTAGE;
      }

      // The "effective" voltage for analog display purposes
      pin.voltage = pwm.dutyCycle * LOGIC_HIGH_VOLTAGE;
    });
  }

  /**
   * Serial output simulation via UART0 / UART1.
   *
   * Pattern-matches common print statements in MicroPython/CircuitPython
   * and emits realistic serial output lines.
   */
  private simulateSerial(code: string): void {
    const activeUARTs = this.uarts.filter((u) => u.enabled);
    if (activeUARTs.length === 0) {
      // Auto-detect UART usage if not pre-configured
      if (code.includes('print(') || code.includes('uart.write(') || code.includes('Serial.print')) {
        if (!this.uarts[0].enabled) {
          this.configureUART(0, 0, 1);
        }
      } else {
        return;
      }
    }

    // Only emit serial lines periodically (simulates UART throughput)
    if (this.stepCounter % Math.max(1, Math.floor(15 / this.speed)) !== 0) return;

    const detectedPattern = this.identifySerialPattern(code);
    if (detectedPattern) {
      detectedPattern.lines.forEach((line) => {
        this.serialBuffer.push(line);
        this.serialCallbacks.forEach((cb) => cb(line));
      });
      return;
    }

    // Fallback: simulate generic print() output
    const printMatch = code.match(/print\s*\(\s*["'](.+?)["']/);
    if (printMatch) {
      this.serialBuffer.push(printMatch[1]);
      this.serialCallbacks.forEach((cb) => cb(printMatch[1]));
    }
  }

  /**
   * I²C device scanning simulation.
   *
   * When `i2c.scan()` is detected, returns a list of mock device addresses.
   */
  private simulateI2CScan(code: string): void {
    if (!code.includes('i2c.scan()')) return;

    // Only emit once at the start
    if (this.stepCounter !== 3) return;

    const activeBus = this.i2cBuses.find((b) => b.enabled);
    if (!activeBus) return;

    const addresses = Array.from(activeBus.devices.keys()).sort((a, b) => a - b);
    const hexList = addresses.map((a) => '0x' + a.toString(16).padStart(2, '0')).join(', ');
    const line = 'I2C devices found at: [' + hexList + ']';

    this.serialBuffer.push(line);
    this.serialCallbacks.forEach((cb) => cb(line));
  }

  /**
   * ADC reading simulation.
   *
   * Produces fluctuating analog values for enabled ADC channels.
   */
  private simulateADCReading(code: string): void {
    if (!code.includes('read_u16(') && !code.includes('read(') && !code.includes('adc.read')) return;

    // Only update periodically
    if (this.stepCounter % Math.max(1, Math.floor(10 / this.speed)) !== 0) return;

    this.adcChannels.forEach((ch) => {
      if (!ch.enabled || ch.gpio === ADC_VREF_GPIO) return;

      // Simulate a slowly drifting analog value (e.g., photoresistor / potentiometer)
      const noise = Math.sin(this.stepCounter * 0.1 + ch.gpio) * 200;
      const base = 2048;
      ch.valueRaw = Math.max(0, Math.min(4095, Math.round(base + noise)));
      ch.voltage = (ch.valueRaw / 4095) * 3.3;

      const pin = this.pins[ch.gpio];
      if (pin) {
        pin.voltage = ch.voltage;
      }
    });
  }

  /**
   * Servo sweep simulation.
   *
   * When a Servo is detected, sweeps the angle back and forth between
   * 0° and 180°.
   */
  private simulateServoSweep(code: string): void {
    if (this.servoAngles.size === 0) return;
    if (!code.includes('Servo') && !code.includes('servo')) return;

    this.servoAngles.forEach((_, gpio) => {
      const period = 120 / this.speed;
      const phase = (this.stepCounter / period) % 2;
      const angle = phase < 1
        ? Math.round(phase * 180)
        : Math.round((2 - phase) * 180);

      this.servoAngles.set(gpio, angle);

      // Update PWM duty cycle to reflect the servo angle
      const pwm = this.pwmAssignments[gpio];
      if (pwm) {
        // Servo: 1 ms pulse = 0°, 2 ms pulse = 180°, at 50 Hz (20 ms period)
        const dutyMin = 0.05;  // 1 ms / 20 ms
        const dutyMax = 0.10;  // 2 ms / 20 ms
        pwm.dutyCycle = dutyMin + (angle / 180) * (dutyMax - dutyMin);
      }
    });
  }

  /**
   * PIO state machine simulation.
   *
   * When PIO code is loaded, mimics state machine execution by toggling
   * output pins at the configured PIO frequency (scaled to simulation time).
   */
  private simulatePIO(code: string): void {
    const activeSMs = this.pioStateMachines.filter((sm) => sm.running);
    if (activeSMs.length === 0) return;

    const activeSM = activeSMs[0];
    const period = Math.max(1, Math.round(40 / this.speed));
    const isHigh = Math.floor(this.stepCounter / period) % 2 === 0;

    if (activeSM.outPins > 0) {
      const pin = this.pins[activeSM.inPins[0] ?? 0];
      if (pin) {
        pin.value = isHigh ? 'high' : 'low';
        pin.voltage = isHigh ? LOGIC_HIGH_VOLTAGE : LOGIC_LOW_VOLTAGE;
      }
    }
  }

  /**
   * Button polling simulation.
   *
   * Checks button pins and generates debounced state changes.
   */
  private simulateButtonPolling(code: string): void {
    if (this.simulatedButtons.size === 0) return;

    const now = Date.now();
    this.simulatedButtons.forEach((btn, gpio) => {
      // Simulate periodic button presses for demo patterns
      if (code.includes('while True') && !code.includes('irq') && code.includes('button')) {
        const pressPeriod = Math.round(80 / this.speed);
        btn.pressed = Math.floor(this.stepCounter / pressPeriod) % 3 === 0;
      }

      if (btn.debounceUntil > now) return;

      const pin = this.pins[gpio];
      if (!pin) return;

      if (btn.pressed) {
        pin.value = 'low';
        pin.voltage = LOGIC_LOW_VOLTAGE;
      } else if (pin.pull === 'up') {
        pin.value = 'high';
        pin.voltage = LOGIC_HIGH_VOLTAGE;
      } else {
        pin.value = 'floating';
        pin.voltage = 0;
      }
    });
  }

  /**
   * SPI transfer simulation.
   *
   * Simulates data being clocked out on MOSI and response data
   * arriving on MISO.
   */
  private simulateSPITransfer(code: string): void {
    const activeBus = this.spiBuses.find((b) => b.enabled);
    if (!activeBus) return;
    if (!code.includes('spi.write') && !code.includes('spi.read') && !code.includes('spi.xfer')) return;

    if (this.stepCounter % Math.max(1, Math.floor(20 / this.speed)) !== 0) return;

    // Simulate SCK toggling
    const sckPin = activeBus.sckPin !== null ? this.pins[activeBus.sckPin] : null;
    if (sckPin) {
      const isHigh = this.stepCounter % 2 === 0;
      sckPin.value = isHigh ? 'high' : 'low';
      sckPin.voltage = isHigh ? LOGIC_HIGH_VOLTAGE : LOGIC_LOW_VOLTAGE;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PRIVATE — Serial pattern detection
  // ═══════════════════════════════════════════════════════════════════════

  private identifySerialPattern(
    code: string,
  ): { lines: string[] } | null {
    // MicroPython LED blink messages
    if (code.includes('LED ON') || code.includes('LED OFF')) {
      const line = this.stepCounter % 2 === 0 ? 'LED ON' : 'LED OFF';
      return { lines: [line] };
    }

    // Temperature sensor simulation
    if (code.includes('Temperature') && (code.includes('BME280') || code.includes('sensor'))) {
      const temp = (20 + Math.sin(this.stepCounter * 0.05) * 5).toFixed(1);
      const line = 'Temperature: ' + temp + ' C';
      return { lines: [line] };
    }

    // Light sensor
    if (code.includes('Light') && code.includes('adc.read')) {
      const val = Math.floor(2048 + Math.sin(this.stepCounter * 0.08) * 1500);
      const line = 'Light: ' + Math.max(0, Math.min(65535, val));
      return { lines: [line] };
    }

    // Potentiometer reading
    if (code.includes('potentiometer') || (code.includes('adc.read') && code.includes('duty'))) {
      const val = Math.floor(32768 + Math.sin(this.stepCounter * 0.06) * 20000);
      const line = 'ADC: ' + Math.max(0, Math.min(65535, val));
      return { lines: [line] };
    }

    // Ultrasonic distance sensor
    if (code.includes('distance') && (code.includes('time_pulse_us') || code.includes('pulse_in'))) {
      const dist = (5 + Math.sin(this.stepCounter * 0.03) * 30 + Math.random() * 2).toFixed(1);
      const line = 'Distance: ' + Math.max(2, parseFloat(dist)).toFixed(1) + ' cm';
      return { lines: [line] };
    }

    // Servo angle reporting
    if (code.includes('servo') && code.includes('angle')) {
      const angle = Math.round((this.stepCounter * 2) % 180);
      return { lines: ['Servo angle: ' + angle + ' deg'] };
    }

    // I²C scan
    if (code.includes('i2c.scan()') && this.stepCounter <= 4) {
      return { lines: ['Scanning I2C bus...', 'Found devices: [0x3c]'] };
    }

    // Accelerometer / gyroscope data
    if (code.includes('accel') || code.includes('MPU') || code.includes('imu')) {
      const ax = (Math.sin(this.stepCounter * 0.1) * 0.5).toFixed(2);
      const ay = (Math.cos(this.stepCounter * 0.07) * 0.3).toFixed(2);
      const az = (9.81 + Math.sin(this.stepCounter * 0.05) * 0.1).toFixed(2);
      return { lines: ['Accel: X=' + ax + ' Y=' + ay + ' Z=' + az + ' m/s²'] };
    }

    // OLED display status
    if (code.includes('SSD1306') || code.includes('OLED') || code.includes('oled')) {
      if (this.stepCounter <= 3) {
        return { lines: ['OLED initialized (128x64)', 'Display cleared'] };
      }
      return { lines: ['OLED: displaying frame ' + Math.floor(this.stepCounter / 10)] };
    }

    // Heartbeat / status message
    if (code.includes('heartbeat') || code.includes('alive')) {
      const elapsed = ((Date.now() - this.startTimeMs) / 1000).toFixed(0);
      return { lines: ['Heartbeat: alive at ' + elapsed + 's'] };
    }

    // Button state
    if (code.includes('button') && code.includes('print') && !code.includes('LED')) {
      const pressed = this.getAnyButtonState();
      const line = 'Button: ' + (pressed ? 'PRESSED' : 'RELEASED');
      return { lines: [line] };
    }

    // WiFi / network (mock)
    if (code.includes('wlan') || code.includes('WLAN') || code.includes('wifi') || code.includes('network')) {
      if (this.stepCounter <= 5) {
        return { lines: ['Connecting to WiFi...', 'Connected! IP: 192.168.1.' + (100 + Math.floor(Math.random() * 50))] };
      }
      return { lines: ['Ping: ' + Math.floor(5 + Math.random() * 20) + ' ms'] };
    }

    // Generic print with variable interpolation (simple fallback)
    const printMatch = code.match(/print\s*\(\s*["'](.+?)["']/);
    if (printMatch) {
      // Expand simple {variable} placeholders with mock values
      const template = printMatch[1];
      const expanded = template
        .replace(/\{.*?\}/g, () => String(Math.floor(Math.random() * 100)))
        .replace('%d', String(Math.floor(Math.random() * 100)));

      return { lines: [expanded] };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PRIVATE — Utility
  // ═══════════════════════════════════════════════════════════════════════

  private getAnyButtonState(): boolean | null {
    for (const [, btn] of this.simulatedButtons) {
      if (btn.pressed) return true;
    }
    return this.simulatedButtons.size > 0 ? false : null;
  }

  private toExternalPinState(pin: InternalPinState): PinState {
    return {
      pinNumber: pin.pinNumber,
      pinName: pin.pinName,
      value: pin.value,
      voltage: pin.voltage,
      current: pin.current,
    };
  }

  private emitPinChange(): void {
    const external = this.pins.map((p) => this.toExternalPinState(p));
    this.pinChangeCallbacks.forEach((cb) => cb(BOARD_ID, external));
  }

  private emitError(message: string): void {
    this.errorCallbacks.forEach((cb) => cb(message));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let rp2040Instance: RP2040Simulation | null = null;

/**
 * Get the singleton `RP2040Simulation` instance.
 *
 * Repeated calls return the same object, so state is shared across all
 * consumers within a session.
 */
export function getRP2040Simulation(): RP2040Simulation {
  if (!rp2040Instance) {
    rp2040Instance = new RP2040Simulation();
  }
  return rp2040Instance;
}
