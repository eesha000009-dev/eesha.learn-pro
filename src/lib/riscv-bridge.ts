/**
 * RISC-V Simulation Bridge for ESP32-C3 (RV32IMAC)
 *
 * Provides a mock simulation environment for the ESP32-C3-DevKitM-1 board
 * targeting Eesha Learn's circuit simulator platform. Simulates RISC-V
 * instruction execution concepts, GPIO pin states, WiFi, BLE, UART, ADC,
 * PWM, and touch sensor behavior.
 *
 * This bridge does NOT execute real RISC-V machine code. Instead it parses
 * the user's Arduino / Espruino (JavaScript) source for recognisable API
 * patterns and emits realistic timed mock behaviour so the simulator UI
 * has something meaningful to display.
 */

import type { PinState } from '@/types';

// ======================== Additional Types ========================

/** WiFi connection state returned by `getWifiState()`. */
export interface WifiState {
  enabled: boolean;
  mode: 'off' | 'sta' | 'ap' | 'sta+ap';
  connected: boolean;
  ssid: string | null;
  bssid: string | null;
  rssi: number;
  ip: string | null;
  gateway: string | null;
  subnet: string | null;
  dns: string | null;
  hostname: string;
  scanning: boolean;
  scanResults: Array<{ ssid: string; rssi: number; channel: number; secure: boolean }>;
}

/** BLE (Bluetooth Low Energy) advertising / connection state. */
export interface BleState {
  enabled: boolean;
  advertising: boolean;
  connected: boolean;
  deviceName: string;
  serviceUuid: string | null;
  maxConnections: number;
  activeConnections: number;
  rssi: number;
  mtu: number;
}

/** ADC channel descriptor. */
export interface ADCChannel {
  channel: number;
  gpio: number;
  value: number; // 0 – 4095 (12-bit)
  voltage: number; // 0.0 – 3.3
}

/** PWM channel descriptor. */
export interface PWMChannel {
  channel: number;
  gpio: number;
  duty: number; // 0 – 1023 (10-bit)
  frequency: number; // Hz
}

/** UART configuration. */
export interface UARTConfig {
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
}

/** Touch sensor reading. */
export interface TouchReading {
  gpio: number;
  value: number; // 0 – 255 (lower = more pressed)
}

/** RISC-V CPU register view (simplified). */
export interface RVRegisters {
  x: Uint32Array; // x0 – x31
  pc: number;
}

/** Code language hint so the parser can tailor its heuristics. */
export type CodeLanguage = 'c' | 'cpp' | 'javascript' | 'espruino' | 'unknown';

/** Simulation event emitted via callbacks. */
export type SimulationEvent =
  | { type: 'pin-change'; pins: PinState[] }
  | { type: 'serial'; uart: number; line: string }
  | { type: 'error'; message: string }
  | { type: 'wifi'; state: WifiState }
  | { type: 'ble'; state: BleState }
  | { type: 'adc'; channel: ADCChannel }
  | { type: 'pwm'; channel: PWMChannel };

// ======================== Constants ========================

/** ESP32-C3 operating voltage. */
const VCC = 3.3;

/** ESP32-C3 GPIO pin descriptors for DevKitM-1. */
interface GPIODescriptor {
  number: number;
  name: string;
  altNames: string[];
  capabilities: Set<string>;
}

const ESP32_C3_GPIO_DESCRIPTORS: GPIODescriptor[] = [
  { number: 0,  name: 'GPIO0',  altNames: ['IO0'],     capabilities: new Set(['gpio', 'rtc', 'adc', 'touch']) },
  { number: 1,  name: 'GPIO1',  altNames: ['IO1'],     capabilities: new Set(['gpio', 'adc', 'touch']) },
  { number: 2,  name: 'GPIO2',  altNames: ['IO2'],     capabilities: new Set(['gpio', 'adc', 'adc1_ch0', 'touch']) },
  { number: 3,  name: 'GPIO3',  altNames: ['IO3'],     capabilities: new Set(['gpio', 'adc', 'adc1_ch1', 'touch']) },
  { number: 4,  name: 'GPIO4',  altNames: ['IO4'],     capabilities: new Set(['gpio', 'adc', 'adc1_ch2', 'touch']) },
  { number: 5,  name: 'GPIO5',  altNames: ['IO5'],     capabilities: new Set(['gpio', 'adc', 'adc1_ch3', 'touch']) },
  { number: 6,  name: 'GPIO6',  altNames: ['IO6'],     capabilities: new Set(['flash_spi', 'strapping']) },
  { number: 7,  name: 'GPIO7',  altNames: ['IO7'],     capabilities: new Set(['flash_spi', 'strapping']) },
  { number: 8,  name: 'GPIO8',  altNames: ['IO8', 'LED', 'RGB_LED'], capabilities: new Set(['gpio', 'pwm', 'ledc']) },
  { number: 9,  name: 'GPIO9',  altNames: ['IO9'],     capabilities: new Set(['gpio', 'pwm', 'ledc', 'i2c_sda']) },
  { number: 10, name: 'GPIO10', altNames: ['IO10'],    capabilities: new Set(['gpio', 'pwm', 'ledc', 'i2c_scl']) },
  { number: 11, name: 'GPIO11', altNames: ['IO11'],    capabilities: new Set(['gpio', 'pwm', 'ledc']) },
  { number: 12, name: 'GPIO12', altNames: ['IO12'],    capabilities: new Set(['gpio', 'pwm', 'ledc', 'spi_hd']) },
  { number: 13, name: 'GPIO13', altNames: ['IO13'],    capabilities: new Set(['gpio', 'pwm', 'ledc', 'spi_wp']) },
  { number: 14, name: 'GPIO14', altNames: ['IO14'],    capabilities: new Set(['gpio', 'pwm', 'ledc', 'spi_clk']) },
  { number: 15, name: 'GPIO15', altNames: ['IO15'],    capabilities: new Set(['gpio', 'pwm', 'ledc', 'spi_q']) },
  { number: 16, name: 'GPIO16', altNames: ['IO16', 'PSRAM_CLK'], capabilities: new Set(['gpio', 'pwm', 'ledc', 'psram']) },
  { number: 17, name: 'GPIO17', altNames: ['IO17', 'PSRAM_CS'],  capabilities: new Set(['gpio', 'pwm', 'ledc', 'psram']) },
  { number: 18, name: 'GPIO18', altNames: ['IO18', 'USB_D-'],   capabilities: new Set(['gpio', 'usb_dp']) },
  { number: 19, name: 'GPIO19', altNames: ['IO19', 'USB_D+'],   capabilities: new Set(['gpio', 'usb_dm']) },
  { number: 20, name: 'GPIO20', altNames: ['IO20', 'RXD0'],     capabilities: new Set(['gpio', 'uart0_rx']) },
  { number: 21, name: 'GPIO21', altNames: ['IO21', 'TXD0'],     capabilities: new Set(['gpio', 'uart0_tx']) },
];

/** Mock SSIDs emitted during WiFi scan simulation. */
const MOCK_SSIDS = [
  { ssid: 'EeshaLab_Network', rssi: -42, channel: 6, secure: true },
  { ssid: 'ESP32_Test_AP',    rssi: -58, channel: 1, secure: false },
  { ssid: 'CircuitSim_5G',    rssi: -67, channel: 36, secure: true },
  { ssid: 'RISC-V_Devices',   rssi: -73, channel: 11, secure: true },
  { ssid: 'OpenWiFi_Guest',   rssi: -81, channel: 3, secure: false },
  { ssid: 'MakerSpace IoT',   rssi: -55, channel: 9, secure: true },
  { ssid: 'ArduinoCloud',     rssi: -90, channel: 1, secure: true },
];

// ======================== Helpers ========================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function detectLanguage(code: string): CodeLanguage {
  if (/^\s*#\s*include\s*<Arduino\.h>/m.test(code) || /^\s*#\s*include\s*<WiFi\.h>/m.test(code)) return 'cpp';
  if (/^\s*void\s+setup\s*\(\)/m.test(code) && /^\s*void\s+loop\s*\(\)/m.test(code)) return 'cpp';
  if (/^\s*var\s/m.test(code) || /^\s*let\s/m.test(code) || /^\s*const\s/m.test(code)) return 'javascript';
  if (/require\s*\(/.test(code) || /digitalWrite/.test(code)) return 'espruino';
  if (/^\s*int\s+main\s*\(/m.test(code)) return 'c';
  return 'unknown';
}

/** Detect the relevant ESP32-C3 GPIO LED pin from the code text. */
function detectLedPin(code: string): number {
  if (/pinMode\s*\(\s*8\s*,\s*OUTPUT/i.test(code) || /digitalWrite\s*\(\s*8/i.test(code)) return 8;
  if (/ledcWrite\s*\(\s*\d+\s*,/.test(code)) {
    const m = code.match(/ledcAttach(?:Pin)?\s*\(\s*(\d+)/);
    if (m) return parseInt(m[1], 10);
  }
  return 8; // Default: DevKitM-1 built-in LED
}

// ======================== RISCVSimulation ========================

export class RISCVSimulation {
  // ---- Internal state ----
  private running = false;
  private speed = 1;
  private stepCounter = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private loadedCode: string | null = null;
  private codeLanguage: CodeLanguage = 'unknown';

  // ---- GPIO ----
  private pins: PinState[] = [];

  // ---- UART ----
  private serialBuffers: Map<number, string[]> = new Map([[0, []], [1, []]]);
  private uartConfigs: Map<number, UARTConfig> = new Map([
    [0, { baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' }],
    [1, { baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' }],
  ]);

  // ---- ADC ----
  private adcChannels: ADCChannel[] = [];

  // ---- PWM ----
  private pwmChannels: PWMChannel[] = [];

  // ---- Touch ----
  private touchReadings: TouchReading[] = [];

  // ---- WiFi ----
  private wifiState: WifiState;

  // ---- BLE ----
  private bleState: BleState;

  // ---- RISC-V register file (simplified mock) ----
  private registers: RVRegisters = {
    x: new Uint32Array(32), // x0 always 0
    pc: 0x4200_0000, // ESP32-C3 ROM base
  };

  // ---- Callbacks ----
  private pinChangeCallbacks: ((pins: PinState[]) => void)[] = [];
  private serialCallbacks: ((uart: number, line: string) => void)[] = [];
  private errorCallbacks: ((error: string) => void)[] = [];
  private eventCallbacks: ((event: SimulationEvent) => void)[] = [];

  // ---- Simulation speed limits ----
  static readonly MIN_SPEED = 0.25;
  static readonly MAX_SPEED = 8;

  // ---- Board metadata ----
  static readonly BOARD_NAME = 'ESP32-C3-DevKitM-1';
  static readonly ARCHITECTURE = 'RV32IMAC';
  static readonly CLOCK_HZ = 160_000_000; // 160 MHz
  static readonly FLASH_SIZE = 4 * 1024 * 1024; // 4 MB
  static readonly SRAM_SIZE = 400 * 1024; // 400 KB
  static readonly GPIO_COUNT = 22; // GPIO0 – GPIO21

  constructor() {
    this.pins = this.createInitialPinStates();
    this.adcChannels = this.createInitialADCChannels();
    this.pwmChannels = [];
    this.touchReadings = this.createInitialTouchReadings();
    this.wifiState = this.createDefaultWifiState();
    this.bleState = this.createDefaultBleState();
  }

  // ==================== Public API ====================

  /** Start the simulation loop. */
  start(): void {
    if (this.running) return;
    if (!this.loadedCode) {
      this.emitError('No code loaded. Call loadCode() before start().');
      return;
    }

    this.running = true;
    this.stepCounter = 0;
    this.resetSerialBuffers();
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

  /** Reset all simulation state to power-on defaults. */
  reset(): void {
    this.stop();
    this.stepCounter = 0;
    this.pins = this.createInitialPinStates();
    this.adcChannels = this.createInitialADCChannels();
    this.pwmChannels = [];
    this.touchReadings = this.createInitialTouchReadings();
    this.registers = { x: new Uint32Array(32), pc: 0x4200_0000 };
    this.wifiState = this.createDefaultWifiState();
    this.bleState = this.createDefaultBleState();
    this.resetSerialBuffers();
    this.emitPinChange();
  }

  /**
   * Set simulation speed multiplier.
   * Clamped to [0.25, 8]. Changing speed while running restarts the loop.
   */
  setSpeed(speed: number): void {
    this.speed = clamp(speed, RISCVSimulation.MIN_SPEED, RISCVSimulation.MAX_SPEED);
    if (this.running) {
      this.stop();
      this.running = true;
      this.runSimulationLoop();
    }
  }

  /**
   * Load user code (C/C++ or JavaScript/Espruino) for pattern analysis.
   * Does NOT compile or execute – the bridge detects API calls and mocks
   * their behaviour at simulation time.
   */
  loadCode(code: string): void {
    this.loadedCode = code;
    this.codeLanguage = detectLanguage(code);
    this.reset();
    this.analyzeCodeForInitialPinStates(code);
  }

  /** Return the current GPIO pin states. */
  getState(): PinState[] {
    return this.pins.map((p) => ({ ...p }));
  }

  /** Register a callback invoked whenever any GPIO pin changes. */
  onPinChange(callback: (pins: PinState[]) => void): void {
    this.pinChangeCallbacks.push(callback);
  }

  /**
   * Register a callback invoked when a line is written to a UART.
   * The `uart` argument identifies UART0 or UART1.
   */
  onSerialOutput(callback: (uart: number, line: string) => void): void {
    this.serialCallbacks.push(callback);
  }

  /** Register a callback invoked on simulation errors. */
  onError(callback: (error: string) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Register a unified event callback receiving all simulation events.
   * Useful for a single listener that wants to handle everything.
   */
  onEvent(callback: (event: SimulationEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /** Return accumulated serial output for the given UART (default UART0). */
  getSerialOutput(uart: number = 0): string[] {
    return [...(this.serialBuffers.get(uart) ?? [])];
  }

  /** Return the current mock WiFi state. */
  getWifiState(): WifiState {
    return { ...this.wifiState };
  }

  /** Return the current mock BLE state. */
  getBleState(): BleState {
    return { ...this.bleState };
  }

  /** Return ADC channel readings. */
  getADCReadings(): ADCChannel[] {
    return this.adcChannels.map((ch) => ({ ...ch }));
  }

  /** Return PWM channel states. */
  getPWMChannels(): PWMChannel[] {
    return this.pwmChannels.map((ch) => ({ ...ch }));
  }

  /** Return touch sensor readings. */
  getTouchReadings(): TouchReading[] {
    return this.touchReadings.map((t) => ({ ...t }));
  }

  /** Return the simplified RISC-V register file. */
  getRegisters(): RVRegisters {
    return {
      x: new Uint32Array(this.registers.x),
      pc: this.registers.pc,
    };
  }

  // ==================== Initialization helpers ====================

  private createInitialPinStates(): PinState[] {
    return ESP32_C3_GPIO_DESCRIPTORS.map((desc) => ({
      pinNumber: desc.number,
      pinName: desc.altNames.length > 0 ? `${desc.name} (${desc.altNames[0]})` : desc.name,
      value: 'low' as const,
      voltage: 0,
      current: 0,
    }));
  }

  private createInitialADCChannels(): ADCChannel[] {
    // ESP32-C3 ADC1: GPIO2–GPIO5
    const adc1Gpios = [2, 3, 4, 5];
    return adc1Gpios.map((gpio, idx) => ({
      channel: idx,
      gpio,
      value: 0,
      voltage: 0,
    }));
  }

  private createInitialTouchReadings(): TouchReading[] {
    // ESP32-C3 touch pins (mock): GPIO1–GPIO5
    return [1, 2, 3, 4, 5].map((gpio) => ({
      gpio,
      value: 255, // no touch
    }));
  }

  private createDefaultWifiState(): WifiState {
    return {
      enabled: false,
      mode: 'off',
      connected: false,
      ssid: null,
      bssid: null,
      rssi: 0,
      ip: null,
      gateway: null,
      subnet: null,
      dns: null,
      hostname: 'esp32c3-eesha',
      scanning: false,
      scanResults: [],
    };
  }

  private createDefaultBleState(): BleState {
    return {
      enabled: false,
      advertising: false,
      connected: false,
      deviceName: 'Eesha-C3',
      serviceUuid: null,
      maxConnections: 3,
      activeConnections: 0,
      rssi: 0,
      mtu: 23,
    };
  }

  private resetSerialBuffers(): void {
    this.serialBuffers.set(0, []);
    this.serialBuffers.set(1, []);
  }

  // ==================== Code analysis ====================

  /** Pre-analyze code to set initial pin modes / directions. */
  private analyzeCodeForInitialPinStates(code: string): void {
    const pins = [...this.pins];

    // Detect pinMode calls
    const pinModeRe = /pinMode\s*\(\s*(\d+)\s*,\s*(?:OUTPUT|INPUT(?:_PULLUP)?|INPUT_PULLDOWN)\s*\)/gi;
    let m: RegExpExecArray | null;
    while ((m = pinModeRe.exec(code)) !== null) {
      const pinNum = parseInt(m[1], 10);
      const dir = m[2].trim();
      const idx = pins.findIndex((p) => p.pinNumber === pinNum);
      if (idx !== -1) {
        pins[idx].value = dir === 'OUTPUT' ? 'low' : 'floating';
      }
    }

    this.pins = pins;

    // Detect LEDC PWM setup
    const ledcAttachRe = /ledcAttach(?:Pin)?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi;
    while ((m = ledcAttachRe.exec(code)) !== null) {
      const gpio = parseInt(m[1], 10);
      const freq = parseInt(m[2], 10) || 5000;
      const ch = this.pwmChannels.length;
      this.pwmChannels.push({ channel: ch, gpio, duty: 0, frequency: freq });
    }

    // Detect UART init
    const serialBeginRe = /Serial(\d)?\.begin\s*\(\s*(\d+)\s*\)/gi;
    while ((m = serialBeginRe.exec(code)) !== null) {
      const uartNum = m[1] ? parseInt(m[1], 10) : 0;
      const baud = parseInt(m[2], 10);
      this.uartConfigs.set(uartNum, {
        ...this.getDefaultUARTConfig(uartNum),
        baudRate: baud,
      });
    }

    // Detect WiFi init
    if (/WiFi\.begin\s*\(/.test(code)) {
      this.wifiState.enabled = true;
      this.wifiState.mode = 'sta';
    }
    if (/WiFi\.softAP\s*\(/.test(code)) {
      this.wifiState.enabled = true;
      this.wifiState.mode = this.wifiState.mode === 'sta' ? 'sta+ap' : 'ap';
    }

    // Detect BLE init
    if (/BLEDevice\.init\s*\(/.test(code) || /NimBLEDevice\.init\s*\(/.test(code)) {
      this.bleState.enabled = true;
      const nameMatch = code.match(/(?:BLE|NimBLE)Device\.init\s*\(\s*"([^"]+)"/);
      if (nameMatch) {
        this.bleState.deviceName = nameMatch[1];
      }
    }

    this.emitPinChange();
  }

  private getDefaultUARTConfig(uart: number): UARTConfig {
    return this.uartConfigs.get(uart) ?? { baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' };
  }

  // ==================== Simulation loop ====================

  private runSimulationLoop(): void {
    if (!this.running || !this.loadedCode) return;

    const code = this.loadedCode;
    // Base tick interval: ~50 ms at 1x speed
    const baseIntervalMs = 50;
    const interval = Math.max(8, Math.round(baseIntervalMs / this.speed));

    this.timerId = setInterval(() => {
      if (!this.running) {
        if (this.timerId !== null) clearInterval(this.timerId);
        return;
      }

      this.stepCounter++;
      this.mockRegisterEvolution();

      // --- LED blink ---
      if (/pinMode\s*\(\s*8\s*,\s*OUTPUT/i.test(code) || /digitalWrite\s*\(\s*8/i.test(code)) {
        this.simulateLEDBlink(code);
      }

      // --- Multi-LED pattern ---
      if (/digitalWrite\s*\(\s*9/i.test(code) || /digitalWrite\s*\(\s*10/i.test(code)) {
        this.simulateMultiLED(code);
      }

      // --- Serial output ---
      if (/Serial\.begin/i.test(code) || /Serial\d*\.println/i.test(code) || /console\.log/i.test(code)) {
        this.simulateSerial(code);
      }

      // --- WiFi simulation ---
      if (this.wifiState.enabled) {
        this.simulateWiFi(code);
      }

      // --- BLE simulation ---
      if (this.bleState.enabled) {
        this.simulateBLE(code);
      }

      // --- ADC simulation ---
      if (/analogRead\s*\(/i.test(code) || /adc1_read\s*\(/i.test(code)) {
        this.simulateADC(code);
      }

      // --- Touch simulation ---
      if (/touchRead\s*\(/i.test(code) || /touch_pad_read\s*\(/i.test(code)) {
        this.simulateTouch(code);
      }

      // --- PWM simulation ---
      if (this.pwmChannels.length > 0 || /ledcWrite\s*\(/i.test(code)) {
        this.simulatePWM(code);
      }

      // --- GPIO output simulation ---
      this.simulateDigitalOutputs(code);

      // Emit pin change every tick
      this.emitPinChange();
    }, interval);
  }

  // ==================== Simulation behaviours ====================

  private mockRegisterEvolution(): void {
    // Simulate small register changes to look alive.
    // x0 is always 0 (RISC-V hardwired zero).
    this.registers.x[0] = 0;
    // Increment a "cycle counter" in x1 (return address – repurposed in simulation).
    this.registers.x[1] = (this.registers.x[1] + 1) >>> 0;
    // Increment PC by 4 (one instruction word at 32-bit).
    this.registers.pc = (this.registers.pc + 4) >>> 0;
    // Small random activity in general-purpose registers.
    if (this.stepCounter % 10 === 0) {
      const t3 = this.registers.x[3];
      this.registers.x[3] = (t3 + Math.floor(Math.random() * 256)) >>> 0;
    }
    if (this.stepCounter % 25 === 0) {
      const t4 = this.registers.x[4];
      this.registers.x[4] = (t4 ^ (this.stepCounter & 0xFFFF)) >>> 0;
    }
  }

  private simulateLEDBlink(code: string): void {
    const ledPin = detectLedPin(code);
    const idx = this.pins.findIndex((p) => p.pinNumber === ledPin);
    if (idx === -1) return;

    // Default blink period: ~1 s at 1x speed → 20 ticks at 50 ms tick.
    const periodTicks = Math.round(20 / this.speed);
    const isHigh = Math.floor(this.stepCounter / periodTicks) % 2 === 0;

    const prevValue = this.pins[idx].value;
    const newValue = isHigh ? 'high' : 'low';
    if (prevValue !== newValue) {
      this.pins[idx] = {
        ...this.pins[idx],
        value: newValue,
        voltage: isHigh ? VCC : 0,
        current: isHigh ? 0.012 : 0, // ~12 mA at 3.3 V
      };
    }
  }

  private simulateMultiLED(code: string): void {
    const periodTicks = Math.round(20 / this.speed);
    const phase = Math.floor(this.stepCounter / periodTicks) % 4;

    const multiPins = [9, 10, 11];
    multiPins.forEach((gpio, i) => {
      const idx = this.pins.findIndex((p) => p.pinNumber === gpio);
      if (idx === -1) return;
      const isHigh = phase === i || (phase === 3 && i === 0);
      this.pins[idx] = {
        ...this.pins[idx],
        value: isHigh ? 'high' : 'low',
        voltage: isHigh ? VCC : 0,
        current: isHigh ? 0.012 : 0,
      };
    });
  }

  private simulateSerial(code: string): void {
    // Throttle serial output – emit roughly every 30 ticks at 1x speed.
    const serialInterval = Math.max(1, Math.floor(30 / this.speed));
    if (this.stepCounter % serialInterval !== 0) return;

    let line: string | null = null;

    // Arduino C/C++ patterns
    if (/Serial\.println\s*\(\s*["']Hello World["']\s*\)/.test(code)) {
      line = 'Hello World';
    } else if (/Serial\.println\s*\(\s*["']LED ON["']\s*\)/.test(code)) {
      line = this.stepCounter % (Math.round(20 / this.speed)) < Math.round(10 / this.speed) ? 'LED ON' : 'LED OFF';
    } else if (/Serial\.println\s*\(\s*["']Blinking["']\s*\)/.test(code)) {
      line = 'Blinking';
    } else if (/Serial\.print\s*\(\s*["']Light:\s*["']/i.test(code)) {
      const val = Math.floor(Math.random() * 4096);
      line = `Light: ${val} | Status: ${val < 2000 ? 'DARK' : 'BRIGHT'}`;
    } else if (/Serial\.print\s*\(\s*["']Temperature:\s*["']/i.test(code)) {
      const temp = (20 + Math.random() * 15).toFixed(1);
      line = `Temperature: ${temp} °C`;
    } else if (/Serial\.print\s*\(\s*["']Humidity:\s*["']/i.test(code)) {
      const hum = (40 + Math.random() * 40).toFixed(1);
      line = `Humidity: ${hum} %`;
    } else if (/Serial\.println\s*\(\s*["']WiFi connected["']\s*\)/i.test(code)) {
      if (this.wifiState.connected) {
        line = `WiFi connected – IP: ${this.wifiState.ip}`;
      } else {
        line = 'Connecting to WiFi...';
      }
    } else if (/Serial\.println\s*\(\s*["']BLE Device Ready["']\s*\)/i.test(code)) {
      if (this.stepCounter <= Math.ceil(5 / this.speed)) {
        line = 'BLE Device Ready';
      }
    } else if (/Serial\.print\s*\(\s*["']ADC["']/i.test(code)) {
      const ch0 = this.adcChannels.length > 0 ? this.adcChannels[0].value : 0;
      line = `ADC[0] = ${ch0} (${((ch0 / 4095) * VCC).toFixed(2)}V)`;
    } else if (/Serial\.println\s*\(\s*["']Setup complete["']\s*\)/i.test(code)) {
      if (this.stepCounter === 1) line = 'Setup complete';
    } else if (/Serial\.println\s*\(\s*["']ESP32-C3 Ready["']\s*\)/i.test(code)) {
      if (this.stepCounter === 1) line = 'ESP32-C3 Ready';
    } else if (/Serial\.print\s*\(\s*analogRead/.test(code)) {
      const val = Math.floor(Math.random() * 4096);
      line = `analogRead = ${val}`;
    } else if (/Serial\.print\s*\(\s*touchRead/.test(code)) {
      const val = Math.floor(100 + Math.random() * 155);
      line = `touchRead = ${val}`;
    }

    // Espruino / JavaScript patterns
    if (line === null) {
      if (/console\.log\s*\(\s*["']Hello["']/.test(code)) {
        line = 'Hello';
      } else if (/Serial1\.print/.test(code)) {
        const val = Math.floor(Math.random() * 4096);
        line = `[Serial1] sensor: ${val}`;
      }
    }

    if (line !== null) {
      this.appendSerial(0, line);
    }
  }

  private simulateWiFi(code: string): void {
    // Connection handshake timeline (in simulation ticks at 1x):
    // Step 1–3:   "Connecting..."
    // Step 4–5:   "Obtaining IP..."
    // Step 6+:    Connected

    const connectDelay = Math.round(6 / this.speed);

    if (this.wifiState.mode === 'sta' || this.wifiState.mode === 'sta+ap') {
      if (this.stepCounter <= connectDelay && !this.wifiState.connected) {
        // Still connecting
        return;
      }

      if (!this.wifiState.connected) {
        this.wifiState.connected = true;
        this.wifiState.ip = '192.168.1.' + (100 + Math.floor(Math.random() * 50));
        this.wifiState.gateway = '192.168.1.1';
        this.wifiState.subnet = '255.255.255.0';
        this.wifiState.dns = '8.8.8.8';
        this.wifiState.rssi = -45 - Math.floor(Math.random() * 20);
        this.wifiState.bssid = 'AA:BB:CC:DD:EE:' + String(Math.floor(Math.random() * 99)).padStart(2, '0');

        // Extract SSID from code
        const ssidMatch = code.match(/WiFi\.begin\s*\(\s*"([^"]+)"/);
        if (ssidMatch) {
          this.wifiState.ssid = ssidMatch[1];
        } else {
          this.wifiState.ssid = 'EeshaLab_Network';
        }

        this.appendSerial(0, `[WiFi] Connected to "${this.wifiState.ssid}"`);
        this.appendSerial(0, `[WiFi] IP address: ${this.wifiState.ip}`);
      }
    }

    // WiFi scan simulation
    if (/WiFi\.scanNetworks/i.test(code) && this.stepCounter % Math.round(60 / this.speed) === 0) {
      this.wifiState.scanning = true;
      const count = 3 + Math.floor(Math.random() * (MOCK_SSIDS.length - 2));
      const shuffled = [...MOCK_SSIDS].sort(() => Math.random() - 0.5).slice(0, count);
      this.wifiState.scanResults = shuffled.map((s) => ({
        ssid: s.ssid,
        rssi: s.rssi + Math.floor(Math.random() * 6 - 3),
        channel: s.channel,
        secure: s.secure,
      }));
      this.appendSerial(0, `[WiFi] Scan complete – ${this.wifiState.scanResults.length} networks found`);
      this.wifiState.scanning = false;
    }

    // Periodic RSSI fluctuation
    if (this.stepCounter % Math.round(40 / this.speed) === 0 && this.wifiState.connected) {
      this.wifiState.rssi = clamp(
        this.wifiState.rssi + Math.floor(Math.random() * 6 - 3),
        -95,
        -30,
      );
    }

    this.emitEvent({ type: 'wifi', state: { ...this.wifiState } });
  }

  private simulateBLE(code: string): void {
    const advDelay = Math.round(3 / this.speed);

    if (this.stepCounter <= advDelay && !this.bleState.advertising) {
      return;
    }

    if (!this.bleState.advertising) {
      this.bleState.advertising = true;
      this.appendSerial(0, `[BLE] Device "${this.bleState.deviceName}" is advertising`);
    }

    // Extract service UUID from code
    if (!this.bleState.serviceUuid) {
      const uuidMatch = code.match(
        /createService\s*\(\s*["']([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})["']\s*\)/,
      );
      if (uuidMatch) {
        this.bleState.serviceUuid = uuidMatch[1];
      } else {
        this.bleState.serviceUuid = '0000ffe0-0000-1000-8000-00805f9b34fb';
      }
    }

    // Simulate a client connecting after some time
    const connectAt = Math.round(80 / this.speed);
    if (this.stepCounter === connectAt && !this.bleState.connected) {
      this.bleState.connected = true;
      this.bleState.activeConnections = 1;
      this.bleState.rssi = -55 - Math.floor(Math.random() * 15);
      this.bleState.mtu = 23 + Math.floor(Math.random() * (512 - 23));
      this.appendSerial(0, `[BLE] Client connected (MTU: ${this.bleState.mtu})`);
    }

    // Fluctuate RSSI
    if (this.stepCounter % Math.round(35 / this.speed) === 0 && this.bleState.connected) {
      this.bleState.rssi = clamp(
        this.bleState.rssi + Math.floor(Math.random() * 8 - 4),
        -90,
        -30,
      );
    }

    this.emitEvent({ type: 'ble', state: { ...this.bleState } });
  }

  private simulateADC(code: string): void {
    const adcInterval = Math.max(1, Math.floor(8 / this.speed));
    if (this.stepCounter % adcInterval !== 0) return;

    this.adcChannels.forEach((ch) => {
      // Smooth random walk between 0–4095
      const delta = Math.floor(Math.random() * 200) - 100;
      const raw = clamp(ch.value + delta, 0, 4095);
      ch.value = raw;
      ch.voltage = (raw / 4095) * VCC;

      // Update the corresponding GPIO pin voltage
      const pinIdx = this.pins.findIndex((p) => p.pinNumber === ch.gpio);
      if (pinIdx !== -1) {
        this.pins[pinIdx] = {
          ...this.pins[pinIdx],
          value: ch.value > 2048 ? 'high' : 'low',
          voltage: ch.voltage,
        };
      }
    });

    this.emitEvent({ type: 'adc', channel: { ...this.adcChannels[0] } });
  }

  private simulateTouch(code: string): void {
    const touchInterval = Math.max(1, Math.floor(12 / this.speed));
    if (this.stepCounter % touchInterval !== 0) return;

    this.touchReadings.forEach((t) => {
      // Simulate no-touch baseline with occasional "press"
      if (Math.random() < 0.03) {
        t.value = Math.floor(20 + Math.random() * 60); // touched
      } else {
        t.value = clamp(t.value + Math.floor(Math.random() * 10 - 5), 30, 255);
      }
    });
  }

  private simulatePWM(code: string): void {
    const pwmInterval = Math.max(1, Math.floor(5 / this.speed));
    if (this.stepCounter % pwmInterval !== 0) return;

    this.pwmChannels.forEach((ch) => {
      // Simulate a slow breathing/fade effect
      const period = Math.round(80 / this.speed);
      const t = (this.stepCounter % period) / period;
      const sineDuty = (Math.sin(t * 2 * Math.PI) + 1) / 2; // 0 – 1
      ch.duty = Math.round(sineDuty * 1023);

      // Update the GPIO pin voltage proportionally
      const pinIdx = this.pins.findIndex((p) => p.pinNumber === ch.gpio);
      if (pinIdx !== -1) {
        const avgVoltage = (ch.duty / 1023) * VCC;
        this.pins[pinIdx] = {
          ...this.pins[pinIdx],
          value: ch.duty > 511 ? 'high' : 'low',
          voltage: parseFloat(avgVoltage.toFixed(3)),
          current: parseFloat(((ch.duty / 1023) * 0.02).toFixed(4)),
        };
      }
    });

    // Detect ledcWrite duty changes in code
    const ledcWriteRe = /ledcWrite\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = ledcWriteRe.exec(code)) !== null) {
      const chNum = parseInt(m[1], 10);
      const duty = parseInt(m[2], 10);
      if (this.pwmChannels[chNum]) {
        this.pwmChannels[chNum].duty = duty;
      }
    }
  }

  private simulateDigitalOutputs(code: string): void {
    // Look for digitalWrite patterns and simulate state machine transitions
    const digitalWrites = code.match(/digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW)\s*\)/gi);
    if (!digitalWrites) return;

    const periodTicks = Math.round(15 / this.speed);
    const writeIndex = Math.floor(this.stepCounter / periodTicks) % digitalWrites.length;

    const m = digitalWrites[writeIndex].match(/digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW)\s*\)/i);
    if (!m) return;

    const pinNum = parseInt(m[1], 10);
    const level = m[2].toUpperCase() === 'HIGH' ? 'high' as const : 'low' as const;

    const idx = this.pins.findIndex((p) => p.pinNumber === pinNum);
    if (idx === -1) return;

    if (this.pins[idx].value !== level) {
      this.pins[idx] = {
        ...this.pins[idx],
        value: level,
        voltage: level === 'high' ? VCC : 0,
        current: level === 'high' ? 0.012 : 0,
      };
    }
  }

  // ==================== Event helpers ====================

  private appendSerial(uart: number, line: string): void {
    const buf = this.serialBuffers.get(uart) ?? [];
    buf.push(line);
    // Keep buffer bounded
    if (buf.length > 500) buf.shift();
    this.serialBuffers.set(uart, buf);

    for (const cb of this.serialCallbacks) {
      cb(uart, line);
    }
    this.emitEvent({ type: 'serial', uart, line });
  }

  private emitPinChange(): void {
    const snapshot = this.pins.map((p) => ({ ...p }));
    for (const cb of this.pinChangeCallbacks) {
      cb(snapshot);
    }
    this.emitEvent({ type: 'pin-change', pins: snapshot });
  }

  private emitError(message: string): void {
    for (const cb of this.errorCallbacks) {
      cb(message);
    }
    this.emitEvent({ type: 'error', message });
  }

  private emitEvent(event: SimulationEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
}

// ==================== Singleton ====================

let riscvSimulationInstance: RISCVSimulation | null = null;

/**
 * Return a singleton `RISCVSimulation` instance.
 * Uses lazy initialisation – the instance is created on first call.
 */
export function getRISCVSimulation(): RISCVSimulation {
  if (!riscvSimulationInstance) {
    riscvSimulationInstance = new RISCVSimulation();
  }
  return riscvSimulationInstance;
}
