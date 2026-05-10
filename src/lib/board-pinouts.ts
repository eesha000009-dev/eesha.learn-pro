/**
 * Eesha Learn — Board Pinouts Database
 * ======================================
 * Comprehensive, accurate pinout data for all supported development boards.
 * Used by the wiring system, schematic viewer, and simulation engine.
 *
 * Coordinate system:
 *   - 1 unit = 2.54mm (0.1") — standard header pitch
 *   - Origin (0, 0) is the top-left corner of the board
 *   - x increases rightward, y increases downward
 *   - Pins are placed at exact header-pitch intervals for pixel-accurate wiring
 */

// ========================== TYPES ==========================

export interface BoardPinout {
  boardId: string;
  boardName: string;
  boardWidth: number; // in board units (1 unit = 2.54mm)
  boardHeight: number;
  boardColor: string;
  usbType: 'usb-b' | 'micro-usb' | 'usb-c';

  /** Every pin on the board with its exact position */
  pins: PinDefinition[];

  /** Pin groups for rendering headers */
  pinGroups: PinGroup[];

  /** Board features (buttons, LEDs, USB connector, MCU chip, antenna, etc.) */
  features: BoardFeature[];
}

export interface PinDefinition {
  /** Unique pin identifier, e.g. "D13", "A0", "GP0", "D2" */
  id: string;
  /** Human-readable display name, e.g. "D13 / SCK" */
  name: string;
  /** Index within the board's pin array (0-based) */
  number: number;
  /** Group this pin belongs to, e.g. "digital-top", "analog-bottom" */
  group: string;

  /** X position in board coordinate units */
  x: number;
  /** Y position in board coordinate units */
  y: number;
  /** Which edge of the board this pin faces */
  side: 'top' | 'bottom' | 'left' | 'right';

  /** Primary electrical type */
  type: 'digital' | 'analog' | 'power' | 'ground' | 'i2c' | 'spi' | 'uart' | 'pwm' | 'adc';
  /** All capabilities: e.g. ["INPUT", "OUTPUT", "PWM", "ADC"] */
  capabilities: string[];

  /** Alternate hardware functions: I2C, SPI, UART mappings */
  altFunctions: AltFunction[];

  /** Electrical default state when board is powered on (before user code) */
  defaultState: 'high' | 'low' | 'floating';
  /** Default voltage level */
  defaultVoltage?: number;
}

export interface PinGroup {
  id: string;
  name: string;
  side: 'left' | 'right' | 'top' | 'bottom';
  pinIds: string[];
  color?: string;
}

export interface AltFunction {
  /** Function name, e.g. "SDA", "SCL", "TX", "RX", "MOSI" */
  name: string;
  /** Protocol name, e.g. "I2C", "UART", "SPI" */
  protocol: string;
}

export interface BoardFeature {
  type: 'button' | 'led' | 'usb' | 'chip' | 'antenna' | 'jumper' | 'regulator' | 'crystal' | 'header';
  id: string;
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}

// ========================== ARDUINO UNO R3 ==========================

const arduinoUnoPins: PinDefinition[] = [
  // ---- POWER HEADER (left side, pins 0-6) ----
  {
    id: 'IOREF', name: 'IOREF', number: 0, group: 'power-left',
    x: 1.5, y: 5, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 5,
  },
  {
    id: 'RESET', name: 'RESET', number: 1, group: 'power-left',
    x: 1.5, y: 6, side: 'left',
    type: 'digital', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'high',
  },
  {
    id: '3V3', name: '3.3V', number: 2, group: 'power-left',
    x: 1.5, y: 7, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 3.3,
  },
  {
    id: '5V', name: '5V', number: 3, group: 'power-left',
    x: 1.5, y: 8, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 5,
  },
  {
    id: 'GND_P1', name: 'GND', number: 4, group: 'power-left',
    x: 1.5, y: 9, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GND_P2', name: 'GND', number: 5, group: 'power-left',
    x: 1.5, y: 10, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'VIN', name: 'VIN', number: 6, group: 'power-left',
    x: 1.5, y: 11, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'floating',
  },

  // ---- DIGITAL HEADER (top side, pins 7-20) ----
  {
    id: 'D0', name: 'D0 / RX', number: 7, group: 'digital-top',
    x: 5, y: 1.5, side: 'top',
    type: 'uart', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'RX', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'D1', name: 'D1 / TX', number: 8, group: 'digital-top',
    x: 6, y: 1.5, side: 'top',
    type: 'uart', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'TX', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'D2', name: 'D2 / INT0', number: 9, group: 'digital-top',
    x: 7, y: 1.5, side: 'top',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D3', name: 'D3~ / INT1', number: 10, group: 'digital-top',
    x: 8, y: 1.5, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D4', name: 'D4', number: 11, group: 'digital-top',
    x: 9, y: 1.5, side: 'top',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D5', name: 'D5~', number: 12, group: 'digital-top',
    x: 10, y: 1.5, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D6', name: 'D6~', number: 13, group: 'digital-top',
    x: 11, y: 1.5, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D7', name: 'D7', number: 14, group: 'digital-top',
    x: 12, y: 1.5, side: 'top',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  // Gap in header between D7 and D8 (space for ICSP / routing)
  {
    id: 'D8', name: 'D8', number: 15, group: 'digital-top',
    x: 14, y: 1.5, side: 'top',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D9', name: 'D9~', number: 16, group: 'digital-top',
    x: 15, y: 1.5, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D10', name: 'D10~ / SS', number: 17, group: 'digital-top',
    x: 16, y: 1.5, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'SS', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D11', name: 'D11~ / MOSI', number: 18, group: 'digital-top',
    x: 17, y: 1.5, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'MOSI', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D12', name: 'D12 / MISO', number: 19, group: 'digital-top',
    x: 18, y: 1.5, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'MISO', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D13', name: 'D13 / SCK', number: 20, group: 'digital-top',
    x: 19, y: 1.5, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'SCK', protocol: 'SPI' }],
    defaultState: 'low', // Built-in LED is active-high, but pin is LOW at boot
  },

  // ---- ANALOG HEADER (bottom side, pins 21-26) ----
  {
    id: 'A0', name: 'A0', number: 21, group: 'analog-bottom',
    x: 19, y: 19.5, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A1', name: 'A1', number: 22, group: 'analog-bottom',
    x: 18, y: 19.5, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A2', name: 'A2', number: 23, group: 'analog-bottom',
    x: 17, y: 19.5, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A3', name: 'A3', number: 24, group: 'analog-bottom',
    x: 16, y: 19.5, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A4', name: 'A4 / SDA', number: 25, group: 'analog-bottom',
    x: 15, y: 19.5, side: 'bottom',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'SDA', protocol: 'I2C' }],
    defaultState: 'floating',
  },
  {
    id: 'A5', name: 'A5 / SCL', number: 26, group: 'analog-bottom',
    x: 14, y: 19.5, side: 'bottom',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'SCL', protocol: 'I2C' }],
    defaultState: 'floating',
  },

  // ---- EXTRA PINS near analog header (bottom side, pins 27-28) ----
  {
    id: 'AREF', name: 'AREF', number: 27, group: 'analog-bottom',
    x: 12, y: 19.5, side: 'bottom',
    type: 'analog', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'GND_P3', name: 'GND', number: 28, group: 'analog-bottom',
    x: 11, y: 19.5, side: 'bottom',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },

  // ---- ICSP HEADER (2x3, pins 29-34) ----
  {
    id: 'ICSP_MISO', name: 'ICSP MISO', number: 29, group: 'icsp',
    x: 10, y: 8, side: 'top',
    type: 'spi', capabilities: ['INPUT'],
    altFunctions: [{ name: 'MISO', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'ICSP_VCC', name: 'ICSP 5V', number: 30, group: 'icsp',
    x: 10, y: 9, side: 'top',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 5,
  },
  {
    id: 'ICSP_SCK', name: 'ICSP SCK', number: 31, group: 'icsp',
    x: 10, y: 10, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'SCK', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'ICSP_MOSI', name: 'ICSP MOSI', number: 32, group: 'icsp',
    x: 11, y: 8, side: 'top',
    type: 'spi', capabilities: ['OUTPUT'],
    altFunctions: [{ name: 'MOSI', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'ICSP_RESET', name: 'ICSP RESET', number: 33, group: 'icsp',
    x: 11, y: 9, side: 'top',
    type: 'digital', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'high',
  },
  {
    id: 'ICSP_GND', name: 'ICSP GND', number: 34, group: 'icsp',
    x: 11, y: 10, side: 'top',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
];

const arduinoUnoGroups: PinGroup[] = [
  {
    id: 'power-left', name: 'Power', side: 'left',
    pinIds: ['IOREF', 'RESET', '3V3', '5V', 'GND_P1', 'GND_P2', 'VIN'],
    color: '#ef4444',
  },
  {
    id: 'digital-top', name: 'Digital', side: 'top',
    pinIds: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13'],
    color: '#3b82f6',
  },
  {
    id: 'analog-bottom', name: 'Analog', side: 'bottom',
    pinIds: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'AREF', 'GND_P3'],
    color: '#22c55e',
  },
  {
    id: 'icsp', name: 'ICSP', side: 'top',
    pinIds: ['ICSP_MISO', 'ICSP_VCC', 'ICSP_SCK', 'ICSP_MOSI', 'ICSP_RESET', 'ICSP_GND'],
    color: '#a855f7',
  },
];

const arduinoUnoFeatures: BoardFeature[] = [
  {
    type: 'usb', id: 'usb-b', name: 'USB Type-B',
    x: 0.5, y: 2, width: 3.5, height: 4, color: '#94a3b8',
    label: 'USB-B',
  },
  {
    type: 'chip', id: 'mcu', name: 'ATmega328P',
    x: 9, y: 11, width: 3, height: 7, color: '#1e293b',
    label: 'ATmega328P',
  },
  {
    type: 'led', id: 'led-builtin', name: 'Built-in LED (L)',
    x: 19, y: 2.5, width: 0.8, height: 0.8, color: '#facc15',
    label: 'L',
  },
  {
    type: 'led', id: 'led-power', name: 'Power LED',
    x: 3, y: 3, width: 0.8, height: 0.8, color: '#22c55e',
    label: 'ON',
  },
  {
    type: 'led', id: 'led-tx', name: 'TX LED',
    x: 4.5, y: 3, width: 0.8, height: 0.8, color: '#facc15',
    label: 'TX',
  },
  {
    type: 'led', id: 'led-rx', name: 'RX LED',
    x: 5.5, y: 3, width: 0.8, height: 0.8, color: '#22c55e',
    label: 'RX',
  },
  {
    type: 'button', id: 'btn-reset', name: 'Reset Button',
    x: 3, y: 13, width: 1.5, height: 1.5, color: '#64748b',
    label: 'RESET',
  },
  {
    type: 'regulator', id: 'regulator', name: 'Voltage Regulator',
    x: 2, y: 11, width: 1, height: 2, color: '#1e293b',
  },
  {
    type: 'crystal', id: 'crystal', name: '16MHz Crystal',
    x: 7, y: 14, width: 1.2, height: 0.6, color: '#94a3b8',
    label: '16MHz',
  },
  {
    type: 'header', id: 'icsp-header', name: 'ICSP Header',
    x: 9.5, y: 7.5, width: 2, height: 3, color: '#1e293b',
    label: 'ICSP',
  },
];

const arduinoUno: BoardPinout = {
  boardId: 'arduino-uno',
  boardName: 'Arduino Uno R3',
  boardWidth: 21,
  boardHeight: 21,
  boardColor: '#0078AA',
  usbType: 'usb-b',
  pins: arduinoUnoPins,
  pinGroups: arduinoUnoGroups,
  features: arduinoUnoFeatures,
};

// ========================== ARDUINO NANO ==========================
// 30-pin DIP layout: 15 pins per side
// Board: ~45mm x 18mm = ~17.7 x 7.1 units

const arduinoNanoPins: PinDefinition[] = [
  // ---- LEFT SIDE (top to bottom, pins 0-14) ----
  {
    id: 'D13_N', name: 'D13 / SCK', number: 0, group: 'digital-left',
    x: 0.5, y: 1, side: 'left',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'SCK', protocol: 'SPI' }],
    defaultState: 'low',
  },
  {
    id: '3V3_N', name: '3.3V', number: 1, group: 'power-left',
    x: 0.5, y: 2, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 3.3,
  },
  {
    id: 'AREF_N', name: 'AREF', number: 2, group: 'power-left',
    x: 0.5, y: 3, side: 'left',
    type: 'analog', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A0_N', name: 'A0', number: 3, group: 'analog-left',
    x: 0.5, y: 4, side: 'left',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A1_N', name: 'A1', number: 4, group: 'analog-left',
    x: 0.5, y: 5, side: 'left',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A2_N', name: 'A2', number: 5, group: 'analog-left',
    x: 0.5, y: 6, side: 'left',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A3_N', name: 'A3', number: 6, group: 'analog-left',
    x: 0.5, y: 7, side: 'left',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A4_N', name: 'A4 / SDA', number: 7, group: 'analog-left',
    x: 0.5, y: 8, side: 'left',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'SDA', protocol: 'I2C' }],
    defaultState: 'floating',
  },
  {
    id: 'A5_N', name: 'A5 / SCL', number: 8, group: 'analog-left',
    x: 0.5, y: 9, side: 'left',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'SCL', protocol: 'I2C' }],
    defaultState: 'floating',
  },
  {
    id: 'A6_N', name: 'A6', number: 9, group: 'analog-left',
    x: 0.5, y: 10, side: 'left',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A7_N', name: 'A7', number: 10, group: 'analog-left',
    x: 0.5, y: 11, side: 'left',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: '5V_N', name: '5V', number: 11, group: 'power-left',
    x: 0.5, y: 12, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 5,
  },
  {
    id: 'RST_N', name: 'RST', number: 12, group: 'power-left',
    x: 0.5, y: 13, side: 'left',
    type: 'digital', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'high',
  },
  {
    id: 'GND_N1', name: 'GND', number: 13, group: 'power-left',
    x: 0.5, y: 14, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'VIN_N', name: 'VIN', number: 14, group: 'power-left',
    x: 0.5, y: 15, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'floating',
  },

  // ---- RIGHT SIDE (top to bottom, pins 15-29) ----
  {
    id: 'D12_N', name: 'D12 / MISO', number: 15, group: 'digital-right',
    x: 16.5, y: 1, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'MISO', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D11_N', name: 'D11~ / MOSI', number: 16, group: 'digital-right',
    x: 16.5, y: 2, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'MOSI', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D10_N', name: 'D10~ / SS', number: 17, group: 'digital-right',
    x: 16.5, y: 3, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'SS', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D9_N', name: 'D9~', number: 18, group: 'digital-right',
    x: 16.5, y: 4, side: 'right',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D8_N', name: 'D8', number: 19, group: 'digital-right',
    x: 16.5, y: 5, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D7_N', name: 'D7', number: 20, group: 'digital-right',
    x: 16.5, y: 6, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D6_N', name: 'D6~', number: 21, group: 'digital-right',
    x: 16.5, y: 7, side: 'right',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D5_N', name: 'D5~', number: 22, group: 'digital-right',
    x: 16.5, y: 8, side: 'right',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D4_N', name: 'D4', number: 23, group: 'digital-right',
    x: 16.5, y: 9, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D3_N', name: 'D3~ / INT1', number: 24, group: 'digital-right',
    x: 16.5, y: 10, side: 'right',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D2_N', name: 'D2 / INT0', number: 25, group: 'digital-right',
    x: 16.5, y: 11, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'GND_N2', name: 'GND', number: 26, group: 'power-right',
    x: 16.5, y: 12, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'RST_N2', name: 'RST', number: 27, group: 'power-right',
    x: 16.5, y: 13, side: 'right',
    type: 'digital', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'high',
  },
  {
    id: 'RX0_N', name: 'D0 / RX', number: 28, group: 'digital-right',
    x: 16.5, y: 14, side: 'right',
    type: 'uart', capabilities: ['INPUT'],
    altFunctions: [{ name: 'RX', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'TX1_N', name: 'D1 / TX', number: 29, group: 'digital-right',
    x: 16.5, y: 15, side: 'right',
    type: 'uart', capabilities: ['OUTPUT'],
    altFunctions: [{ name: 'TX', protocol: 'UART' }],
    defaultState: 'floating',
  },
];

const arduinoNanoGroups: PinGroup[] = [
  {
    id: 'power-left', name: 'Power (L)', side: 'left',
    pinIds: ['3V3_N', 'AREF_N', '5V_N', 'RST_N', 'GND_N1', 'VIN_N'],
    color: '#ef4444',
  },
  {
    id: 'analog-left', name: 'Analog (L)', side: 'left',
    pinIds: ['A0_N', 'A1_N', 'A2_N', 'A3_N', 'A4_N', 'A5_N', 'A6_N', 'A7_N'],
    color: '#22c55e',
  },
  {
    id: 'digital-left', name: 'Digital (L)', side: 'left',
    pinIds: ['D13_N'],
    color: '#3b82f6',
  },
  {
    id: 'digital-right', name: 'Digital (R)', side: 'right',
    pinIds: ['D12_N', 'D11_N', 'D10_N', 'D9_N', 'D8_N', 'D7_N', 'D6_N', 'D5_N', 'D4_N', 'D3_N', 'D2_N', 'RX0_N', 'TX1_N'],
    color: '#3b82f6',
  },
  {
    id: 'power-right', name: 'Power (R)', side: 'right',
    pinIds: ['GND_N2', 'RST_N2'],
    color: '#ef4444',
  },
];

const arduinoNanoFeatures: BoardFeature[] = [
  {
    type: 'usb', id: 'usb-mini', name: 'USB Mini-B',
    x: 4, y: 7.5, width: 3, height: 2, color: '#94a3b8',
    label: 'Mini-B',
  },
  {
    type: 'chip', id: 'mcu-nano', name: 'ATmega328P',
    x: 7, y: 5.5, width: 2.5, height: 5, color: '#1e293b',
    label: 'ATmega328P',
  },
  {
    type: 'led', id: 'led-builtin-nano', name: 'Built-in LED (L)',
    x: 14, y: 1.5, width: 0.6, height: 0.6, color: '#facc15',
    label: 'L',
  },
  {
    type: 'led', id: 'led-power-nano', name: 'Power LED',
    x: 14, y: 6, width: 0.6, height: 0.6, color: '#22c55e',
    label: 'PWR',
  },
  {
    type: 'button', id: 'btn-reset-nano', name: 'Reset Button',
    x: 14, y: 4, width: 1, height: 1, color: '#64748b',
    label: 'RST',
  },
  {
    type: 'crystal', id: 'crystal-nano', name: '16MHz Crystal',
    x: 5, y: 5.5, width: 1, height: 0.5, color: '#94a3b8',
    label: '16MHz',
  },
];

const arduinoNano: BoardPinout = {
  boardId: 'arduino-nano',
  boardName: 'Arduino Nano',
  boardWidth: 17,
  boardHeight: 16,
  boardColor: '#0078AA',
  usbType: 'micro-usb',
  pins: arduinoNanoPins,
  pinGroups: arduinoNanoGroups,
  features: arduinoNanoFeatures,
};

// ========================== ESP32 DevKit V1 ==========================
// ESP-WROOM-32 module, 32 pins (16 per side)
// Board: ~55mm x 28mm = ~21.7 x 11 units
// Note: GPIO34, GPIO35, GPIO36(VP), GPIO39(VN) are INPUT-ONLY

const esp32Pins: PinDefinition[] = [
  // ---- LEFT SIDE (top to bottom, pins 0-15) ----
  {
    id: '3V3_E', name: '3.3V', number: 0, group: 'power-left',
    x: 0.5, y: 1, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 3.3,
  },
  {
    id: 'GND_E1', name: 'GND', number: 1, group: 'power-left',
    x: 0.5, y: 2, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'D15', name: 'GPIO15', number: 2, group: 'digital-left',
    x: 0.5, y: 3, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'HSPI_CS0', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D2', name: 'GPIO2', number: 3, group: 'digital-left',
    x: 0.5, y: 4, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D4', name: 'GPIO4', number: 4, group: 'digital-left',
    x: 0.5, y: 5, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [{ name: 'HSPI_HD', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D16', name: 'GPIO16', number: 5, group: 'digital-left',
    x: 0.5, y: 6, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'UART2_RX', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'D17', name: 'GPIO17', number: 6, group: 'digital-left',
    x: 0.5, y: 7, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'UART2_TX', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'D5', name: 'GPIO5', number: 7, group: 'digital-left',
    x: 0.5, y: 8, side: 'left',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'VSPI_CS0', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D18', name: 'GPIO18', number: 8, group: 'digital-left',
    x: 0.5, y: 9, side: 'left',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'VSPI_CLK', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D19', name: 'GPIO19', number: 9, group: 'digital-left',
    x: 0.5, y: 10, side: 'left',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'VSPI_MISO', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D21', name: 'GPIO21 / SDA', number: 10, group: 'digital-left',
    x: 0.5, y: 11, side: 'left',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [
      { name: 'SDA', protocol: 'I2C' },
      { name: 'VSPI_MOSI', protocol: 'SPI' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D3', name: 'GPIO3 / RX', number: 11, group: 'digital-left',
    x: 0.5, y: 12, side: 'left',
    type: 'uart', capabilities: ['INPUT'],
    altFunctions: [{ name: 'RX0', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'D1', name: 'GPIO1 / TX', number: 12, group: 'digital-left',
    x: 0.5, y: 13, side: 'left',
    type: 'uart', capabilities: ['OUTPUT'],
    altFunctions: [{ name: 'TX0', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'D22', name: 'GPIO22 / SCL', number: 13, group: 'digital-left',
    x: 0.5, y: 14, side: 'left',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'SCL', protocol: 'I2C' }],
    defaultState: 'floating',
  },
  {
    id: 'D23', name: 'GPIO23', number: 14, group: 'digital-left',
    x: 0.5, y: 15, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'GND_E2', name: 'GND', number: 15, group: 'power-left',
    x: 0.5, y: 16, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },

  // ---- RIGHT SIDE (top to bottom, pins 16-31) ----
  {
    id: 'VIN_E', name: 'VIN', number: 16, group: 'power-right',
    x: 20.5, y: 1, side: 'right',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'GND_E3', name: 'GND', number: 17, group: 'power-right',
    x: 20.5, y: 2, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'D13', name: 'GPIO13', number: 18, group: 'digital-right',
    x: 20.5, y: 3, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [{ name: 'HSPI_MOSI', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D12', name: 'GPIO12', number: 19, group: 'digital-right',
    x: 20.5, y: 4, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [
      { name: 'HSPI_MISO', protocol: 'SPI' },
      { name: 'DAC_1', protocol: 'ANALOG' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D14', name: 'GPIO14', number: 20, group: 'digital-right',
    x: 20.5, y: 5, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [{ name: 'HSPI_CLK', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D27', name: 'GPIO27', number: 21, group: 'digital-right',
    x: 20.5, y: 6, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D26', name: 'GPIO26', number: 22, group: 'digital-right',
    x: 20.5, y: 7, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D25', name: 'GPIO25', number: 23, group: 'digital-right',
    x: 20.5, y: 8, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [
      { name: 'DAC_2', protocol: 'ANALOG' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D33', name: 'GPIO33', number: 24, group: 'digital-right',
    x: 20.5, y: 9, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D32', name: 'GPIO32', number: 25, group: 'digital-right',
    x: 20.5, y: 10, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'TOUCH'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D35', name: 'GPIO35', number: 26, group: 'analog-right',
    x: 20.5, y: 11, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D34', name: 'GPIO34', number: 27, group: 'analog-right',
    x: 20.5, y: 12, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'VN', name: 'VP / GPIO36', number: 28, group: 'analog-right',
    x: 20.5, y: 13, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'VP', name: 'VN / GPIO39', number: 29, group: 'analog-right',
    x: 20.5, y: 14, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'EN_E', name: 'EN', number: 30, group: 'power-right',
    x: 20.5, y: 15, side: 'right',
    type: 'digital', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'high',
  },
  {
    id: 'GND_E4', name: 'GND', number: 31, group: 'power-right',
    x: 20.5, y: 16, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
];

const esp32Groups: PinGroup[] = [
  {
    id: 'power-left', name: 'Power (L)', side: 'left',
    pinIds: ['3V3_E', 'GND_E1', 'GND_E2'],
    color: '#ef4444',
  },
  {
    id: 'digital-left', name: 'GPIO (L)', side: 'left',
    pinIds: ['D15', 'D2', 'D4', 'D16', 'D17', 'D5', 'D18', 'D19', 'D21', 'D3', 'D1', 'D22', 'D23'],
    color: '#f59e0b',
  },
  {
    id: 'power-right', name: 'Power (R)', side: 'right',
    pinIds: ['VIN_E', 'GND_E3', 'EN_E', 'GND_E4'],
    color: '#ef4444',
  },
  {
    id: 'digital-right', name: 'GPIO (R)', side: 'right',
    pinIds: ['D13', 'D12', 'D14', 'D27', 'D26', 'D25', 'D33', 'D32'],
    color: '#f59e0b',
  },
  {
    id: 'analog-right', name: 'ADC Input-Only (R)', side: 'right',
    pinIds: ['D35', 'D34', 'VN', 'VP'],
    color: '#22c55e',
  },
];

const esp32Features: BoardFeature[] = [
  {
    type: 'usb', id: 'usb-micro-esp', name: 'Micro-USB',
    x: 5, y: 3, width: 3, height: 3, color: '#94a3b8',
    label: 'Micro-USB',
  },
  {
    type: 'chip', id: 'esp32-module', name: 'ESP-WROOM-32',
    x: 7, y: 5, width: 7, height: 8, color: '#374151',
    label: 'ESP-WROOM-32',
  },
  {
    type: 'button', id: 'btn-boot', name: 'BOOT Button',
    x: 4, y: 10, width: 1.5, height: 1.5, color: '#64748b',
    label: 'BOOT',
  },
  {
    type: 'button', id: 'btn-en', name: 'EN Button',
    x: 4, y: 13, width: 1.5, height: 1.5, color: '#64748b',
    label: 'EN',
  },
  {
    type: 'led', id: 'led-blue-esp', name: 'Built-in LED',
    x: 2.5, y: 1.5, width: 0.6, height: 0.6, color: '#3b82f6',
    label: 'LED',
  },
  {
    type: 'antenna', id: 'wifi-antenna', name: 'WiFi Antenna',
    x: 15, y: 2, width: 4, height: 3, color: '#6b7280',
    label: 'WiFi/BLE',
  },
  {
    type: 'regulator', id: 'regulator-esp', name: '3.3V Regulator',
    x: 3, y: 7, width: 1.2, height: 1.5, color: '#1e293b',
  },
];

const esp32DevKit: BoardPinout = {
  boardId: 'esp32-devkit',
  boardName: 'ESP32 DevKit V1',
  boardWidth: 21,
  boardHeight: 17,
  boardColor: '#1B1B1B',
  usbType: 'micro-usb',
  pins: esp32Pins,
  pinGroups: esp32Groups,
  features: esp32Features,
};

// ========================== RASPBERRY PI PICO ==========================
// RP2040, 40 pads (20 per side)
// Board: ~51mm x 21mm = ~20.1 x 8.3 units
// GP26-GP29 have ADC (ADC0-ADC3)
// GP23, GP24, GP25 are NOT exposed on original Pico

const picoPins: PinDefinition[] = [
  // ---- LEFT SIDE (top to bottom, pads 0-19) ----
  {
    id: 'GP0', name: 'GP0', number: 0, group: 'gpio-left',
    x: 0.5, y: 1, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SDA', protocol: 'I2C' },
      { name: 'SPI0_RX', protocol: 'SPI' },
      { name: 'UART0_TX', protocol: 'UART' },
      { name: 'PWM0_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP1', name: 'GP1', number: 1, group: 'gpio-left',
    x: 0.5, y: 2, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SCL', protocol: 'I2C' },
      { name: 'SPI0_CSn', protocol: 'SPI' },
      { name: 'UART0_RX', protocol: 'UART' },
      { name: 'PWM0_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GND_P0', name: 'GND', number: 2, group: 'power-left',
    x: 0.5, y: 3, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GP2', name: 'GP2', number: 3, group: 'gpio-left',
    x: 0.5, y: 4, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SDA', protocol: 'I2C' },
      { name: 'SPI0_SCK', protocol: 'SPI' },
      { name: 'UART1_TX', protocol: 'UART' },
      { name: 'PWM1_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP3', name: 'GP3', number: 4, group: 'gpio-left',
    x: 0.5, y: 5, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'SPI0_TX', protocol: 'SPI' },
      { name: 'UART1_RX', protocol: 'UART' },
      { name: 'PWM1_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP4', name: 'GP4', number: 5, group: 'gpio-left',
    x: 0.5, y: 6, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SDA', protocol: 'I2C' },
      { name: 'SPI0_RX', protocol: 'SPI' },
      { name: 'UART1_TX', protocol: 'UART' },
      { name: 'PWM2_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP5', name: 'GP5', number: 6, group: 'gpio-left',
    x: 0.5, y: 7, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SCL', protocol: 'I2C' },
      { name: 'SPI0_CSn', protocol: 'SPI' },
      { name: 'UART1_RX', protocol: 'UART' },
      { name: 'PWM2_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GND_P1', name: 'GND', number: 7, group: 'power-left',
    x: 0.5, y: 8, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GP6', name: 'GP6', number: 8, group: 'gpio-left',
    x: 0.5, y: 9, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SDA', protocol: 'I2C' },
      { name: 'SPI0_SCK', protocol: 'SPI' },
      { name: 'UART1_TX', protocol: 'UART' },
      { name: 'PWM3_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP7', name: 'GP7', number: 9, group: 'gpio-left',
    x: 0.5, y: 10, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'SPI0_TX', protocol: 'SPI' },
      { name: 'UART1_RX', protocol: 'UART' },
      { name: 'PWM3_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP8', name: 'GP8', number: 10, group: 'gpio-left',
    x: 0.5, y: 11, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SDA', protocol: 'I2C' },
      { name: 'SPI0_RX', protocol: 'SPI' },
      { name: 'UART1_TX', protocol: 'UART' },
      { name: 'PWM4_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP9', name: 'GP9', number: 11, group: 'gpio-left',
    x: 0.5, y: 12, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SCL', protocol: 'I2C' },
      { name: 'SPI0_CSn', protocol: 'SPI' },
      { name: 'UART1_RX', protocol: 'UART' },
      { name: 'PWM4_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP10', name: 'GP10', number: 12, group: 'gpio-left',
    x: 0.5, y: 13, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SDA', protocol: 'I2C' },
      { name: 'SPI0_SCK', protocol: 'SPI' },
      { name: 'UART1_TX', protocol: 'UART' },
      { name: 'PWM5_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP11', name: 'GP11', number: 13, group: 'gpio-left',
    x: 0.5, y: 14, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'SPI0_TX', protocol: 'SPI' },
      { name: 'UART1_RX', protocol: 'UART' },
      { name: 'PWM5_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP12', name: 'GP12', number: 14, group: 'gpio-left',
    x: 0.5, y: 15, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SDA', protocol: 'I2C' },
      { name: 'SPI0_RX', protocol: 'SPI' },
      { name: 'UART0_TX', protocol: 'UART' },
      { name: 'PWM6_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP13', name: 'GP13', number: 15, group: 'gpio-left',
    x: 0.5, y: 16, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SCL', protocol: 'I2C' },
      { name: 'SPI0_CSn', protocol: 'SPI' },
      { name: 'UART0_RX', protocol: 'UART' },
      { name: 'PWM6_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GND_P2', name: 'GND', number: 16, group: 'power-left',
    x: 0.5, y: 17, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GP14', name: 'GP14', number: 17, group: 'gpio-left',
    x: 0.5, y: 18, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SDA', protocol: 'I2C' },
      { name: 'SPI0_SCK', protocol: 'SPI' },
      { name: 'UART0_TX', protocol: 'UART' },
      { name: 'PWM7_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP15', name: 'GP15', number: 18, group: 'gpio-left',
    x: 0.5, y: 19, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SCL', protocol: 'I2C' },
      { name: 'SPI0_TX', protocol: 'SPI' },
      { name: 'UART0_RX', protocol: 'UART' },
      { name: 'PWM7_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'TESTEN', name: 'TESTEN', number: 19, group: 'debug-left',
    x: 0.5, y: 20, side: 'left',
    type: 'digital', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },

  // ---- RIGHT SIDE (top to bottom, pads 20-39) ----
  {
    id: 'VBUS', name: 'VBUS', number: 20, group: 'power-right',
    x: 19.5, y: 1, side: 'right',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'floating', // only powered when USB is connected
  },
  {
    id: 'VSYS', name: 'VSYS', number: 21, group: 'power-right',
    x: 19.5, y: 2, side: 'right',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'floating', // 1.8V-5.5V input
  },
  {
    id: 'GND_P3', name: 'GND', number: 22, group: 'power-right',
    x: 19.5, y: 3, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GP22', name: 'GP22', number: 23, group: 'gpio-right',
    x: 19.5, y: 4, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'GP21', name: 'GP21', number: 24, group: 'gpio-right',
    x: 19.5, y: 5, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SDA', protocol: 'I2C' },
      { name: 'SPI0_RX', protocol: 'SPI' },
      { name: 'UART0_TX', protocol: 'UART' },
      { name: 'PWM0_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GND_P4', name: 'GND', number: 25, group: 'power-right',
    x: 19.5, y: 6, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GP20', name: 'GP20', number: 26, group: 'gpio-right',
    x: 19.5, y: 7, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SCL', protocol: 'I2C' },
      { name: 'SPI0_CSn', protocol: 'SPI' },
      { name: 'UART0_RX', protocol: 'UART' },
      { name: 'PWM0_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP19', name: 'GP19', number: 27, group: 'gpio-right',
    x: 19.5, y: 8, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SDA', protocol: 'I2C' },
      { name: 'SPI0_SCK', protocol: 'SPI' },
      { name: 'UART1_TX', protocol: 'UART' },
      { name: 'PWM1_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GND_P5', name: 'GND', number: 28, group: 'power-right',
    x: 19.5, y: 9, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GP18', name: 'GP18', number: 29, group: 'gpio-right',
    x: 19.5, y: 10, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'SPI0_TX', protocol: 'SPI' },
      { name: 'UART1_RX', protocol: 'UART' },
      { name: 'PWM1_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP17', name: 'GP17', number: 30, group: 'gpio-right',
    x: 19.5, y: 11, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SDA', protocol: 'I2C' },
      { name: 'SPI0_RX', protocol: 'SPI' },
      { name: 'UART0_TX', protocol: 'UART' },
      { name: 'PWM2_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GND_P6', name: 'GND', number: 31, group: 'power-right',
    x: 19.5, y: 12, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GP16', name: 'GP16', number: 32, group: 'gpio-right',
    x: 19.5, y: 13, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SCL', protocol: 'I2C' },
      { name: 'SPI0_CSn', protocol: 'SPI' },
      { name: 'UART0_RX', protocol: 'UART' },
      { name: 'PWM2_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  // Gap in GPIO numbering: GP23-GP25 are used internally for flash on original Pico
  {
    id: 'GP26', name: 'GP26 / ADC0', number: 33, group: 'adc-right',
    x: 19.5, y: 14, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SDA', protocol: 'I2C' },
      { name: 'SPI0_SCK', protocol: 'SPI' },
      { name: 'UART1_TX', protocol: 'UART' },
      { name: 'PWM3_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GP27', name: 'GP27 / ADC1', number: 34, group: 'adc-right',
    x: 19.5, y: 15, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'SPI0_TX', protocol: 'SPI' },
      { name: 'UART1_RX', protocol: 'UART' },
      { name: 'PWM3_B', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'GND_P7', name: 'GND', number: 35, group: 'power-right',
    x: 19.5, y: 16, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GP28', name: 'GP28 / ADC2', number: 36, group: 'adc-right',
    x: 19.5, y: 17, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'PWM'],
    altFunctions: [
      { name: 'I2C0_SDA', protocol: 'I2C' },
      { name: 'SPI0_RX', protocol: 'SPI' },
      { name: 'UART0_TX', protocol: 'UART' },
      { name: 'PWM4_A', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'ADC_VREF', name: 'ADC_VREF', number: 37, group: 'power-right',
    x: 19.5, y: 18, side: 'right',
    type: 'analog', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'GP29', name: 'GP29 / ADC3', number: 38, group: 'adc-right',
    x: 19.5, y: 19, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'GND_P8', name: 'GND', number: 39, group: 'power-right',
    x: 19.5, y: 20, side: 'right',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
];

const picoGroups: PinGroup[] = [
  {
    id: 'gpio-left', name: 'GPIO (L)', side: 'left',
    pinIds: ['GP0', 'GP1', 'GP2', 'GP3', 'GP4', 'GP5', 'GP6', 'GP7', 'GP8', 'GP9',
             'GP10', 'GP11', 'GP12', 'GP13', 'GP14', 'GP15'],
    color: '#22c55e',
  },
  {
    id: 'power-left', name: 'Power (L)', side: 'left',
    pinIds: ['GND_P0', 'GND_P1', 'GND_P2'],
    color: '#ef4444',
  },
  {
    id: 'debug-left', name: 'Debug (L)', side: 'left',
    pinIds: ['TESTEN'],
    color: '#a855f7',
  },
  {
    id: 'power-right', name: 'Power (R)', side: 'right',
    pinIds: ['VBUS', 'VSYS', 'GND_P3', 'GND_P4', 'GND_P5', 'GND_P6', 'GND_P7', 'ADC_VREF', 'GND_P8'],
    color: '#ef4444',
  },
  {
    id: 'gpio-right', name: 'GPIO (R)', side: 'right',
    pinIds: ['GP22', 'GP21', 'GP20', 'GP19', 'GP18', 'GP17', 'GP16'],
    color: '#22c55e',
  },
  {
    id: 'adc-right', name: 'ADC / GPIO (R)', side: 'right',
    pinIds: ['GP26', 'GP27', 'GP28', 'GP29'],
    color: '#06b6d4',
  },
];

const picoFeatures: BoardFeature[] = [
  {
    type: 'usb', id: 'usb-micro-pico', name: 'USB Micro-B',
    x: 7, y: -0.5, width: 3, height: 2, color: '#94a3b8',
    label: 'Micro-USB',
  },
  {
    type: 'chip', id: 'rp2040', name: 'RP2040',
    x: 7, y: 7, width: 5, height: 6, color: '#1e293b',
    label: 'RP2040',
  },
  {
    type: 'button', id: 'btn-bootsel', name: 'BOOTSEL Button',
    x: 5, y: 1.5, width: 1.5, height: 1.2, color: '#f59e0b',
    label: 'BOOTSEL',
  },
  {
    type: 'led', id: 'led-builtin-pico', name: 'Built-in LED (GP25)',
    x: 13, y: 0.5, width: 0.6, height: 0.6, color: '#22c55e',
    label: 'LED',
  },
  {
    type: 'regulator', id: 'regulator-pico', name: '3.3V Regulator',
    x: 13, y: 3, width: 1.5, height: 2, color: '#1e293b',
  },
  {
    type: 'crystal', id: 'crystal-pico', name: '12MHz Crystal',
    x: 5, y: 9, width: 1.2, height: 0.6, color: '#94a3b8',
    label: '12MHz',
  },
];

const picoBoard: BoardPinout = {
  boardId: 'raspberry-pi-pico',
  boardName: 'Raspberry Pi Pico',
  boardWidth: 20,
  boardHeight: 21,
  boardColor: '#1B3A1B',
  usbType: 'micro-usb',
  pins: picoPins,
  pinGroups: picoGroups,
  features: picoFeatures,
};

// ========================== STM32 NUCLEO-F411RE ==========================
// ARM Cortex-M4F, 100MHz
// Arduino Uno compatible headers + Morpho headers
// Board: ~70mm x 75mm = ~27.6 x 29.5 units
// MCU: STM32F411RE (LQFP64)
// ST-Link debugger section (can be snapped off)

const stm32Pins: PinDefinition[] = [
  // ---- ARDUINO POWER HEADER (left side, compatible with Uno) ----
  {
    id: 'IOREF_S', name: 'IOREF', number: 0, group: 'arduino-power',
    x: 2, y: 5, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 3.3,
  },
  {
    id: 'RESET_S', name: 'RESET', number: 1, group: 'arduino-power',
    x: 2, y: 6, side: 'left',
    type: 'digital', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'high',
  },
  {
    id: '3V3_S', name: '3.3V', number: 2, group: 'arduino-power',
    x: 2, y: 7, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 3.3,
  },
  {
    id: '5V_S', name: '5V', number: 3, group: 'arduino-power',
    x: 2, y: 8, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 5,
  },
  {
    id: 'GND_S1', name: 'GND', number: 4, group: 'arduino-power',
    x: 2, y: 9, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'GND_S2', name: 'GND', number: 5, group: 'arduino-power',
    x: 2, y: 10, side: 'left',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
  {
    id: 'VIN_S', name: 'VIN', number: 6, group: 'arduino-power',
    x: 2, y: 11, side: 'left',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'floating',
  },

  // ---- ARDUINO DIGITAL HEADER (top side) ----
  {
    id: 'D0_S', name: 'D0 / PA3 / RX', number: 7, group: 'arduino-digital',
    x: 7, y: 3, side: 'top',
    type: 'uart', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'RX', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'D1_S', name: 'D1 / PA2 / TX', number: 8, group: 'arduino-digital',
    x: 8, y: 3, side: 'top',
    type: 'uart', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'TX', protocol: 'UART' }],
    defaultState: 'floating',
  },
  {
    id: 'D2_S', name: 'D2 / PA10', number: 9, group: 'arduino-digital',
    x: 9, y: 3, side: 'top',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'D3_S', name: 'D3~ / PB3', number: 10, group: 'arduino-digital',
    x: 10, y: 3, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'SPI1_SCK', protocol: 'SPI' },
      { name: 'TIM2_CH2', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D4_S', name: 'D4 / PB5', number: 11, group: 'arduino-digital',
    x: 11, y: 3, side: 'top',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'SPI1_MOSI', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'D5_S', name: 'D5~ / PB4', number: 12, group: 'arduino-digital',
    x: 12, y: 3, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'SPI1_MISO', protocol: 'SPI' },
      { name: 'TIM3_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D6_S', name: 'D6~ / PB10', number: 13, group: 'arduino-digital',
    x: 13, y: 3, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C2_SCL', protocol: 'I2C' },
      { name: 'SPI2_SCK', protocol: 'SPI' },
      { name: 'TIM2_CH3', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D7_S', name: 'D7 / PA8', number: 14, group: 'arduino-digital',
    x: 14, y: 3, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'TIM1_CH1', protocol: 'PWM' },
      { name: 'MCO', protocol: 'CLOCK' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D8_S', name: 'D8 / PA9', number: 15, group: 'arduino-digital',
    x: 16, y: 3, side: 'top',
    type: 'uart', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'TX1', protocol: 'UART' },
      { name: 'I2C1_SDA', protocol: 'I2C' },
      { name: 'TIM1_CH2', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D9_S', name: 'D9~ / PC7', number: 16, group: 'arduino-digital',
    x: 17, y: 3, side: 'top',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'TIM3_CH2', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'D10_S', name: 'D10~ / PB6', number: 17, group: 'arduino-digital',
    x: 18, y: 3, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'SPI1_NSS', protocol: 'SPI' },
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'TIM4_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D11_S', name: 'D11~ / PA7', number: 18, group: 'arduino-digital',
    x: 19, y: 3, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'SPI1_MOSI', protocol: 'SPI' },
      { name: 'TIM1_CH1N', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D12_S', name: 'D12 / PA6', number: 19, group: 'arduino-digital',
    x: 20, y: 3, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'SPI1_MISO', protocol: 'SPI' },
      { name: 'TIM3_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'D13_S', name: 'D13 / PA5', number: 20, group: 'arduino-digital',
    x: 21, y: 3, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [
      { name: 'SPI1_SCK', protocol: 'SPI' },
      { name: 'TIM2_CH1', protocol: 'PWM' },
    ],
    defaultState: 'low', // Built-in LED active-high, pin LOW at boot
  },

  // ---- ARDUINO ANALOG HEADER (bottom side) ----
  {
    id: 'A0_S', name: 'A0 / PA0', number: 21, group: 'arduino-analog',
    x: 21, y: 19, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'TIM2_CH1', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'A1_S', name: 'A1 / PA1', number: 22, group: 'arduino-analog',
    x: 20, y: 19, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'TIM2_CH2', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'A2_S', name: 'A2 / PA4', number: 23, group: 'arduino-analog',
    x: 19, y: 19, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'DAC_OUT1', protocol: 'ANALOG' }],
    defaultState: 'floating',
  },
  {
    id: 'A3_S', name: 'A3 / PB0', number: 24, group: 'arduino-analog',
    x: 18, y: 19, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [{ name: 'TIM3_CH3', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'A4_S', name: 'A4 / PC1', number: 25, group: 'arduino-analog',
    x: 17, y: 19, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'A5_S', name: 'A5 / PC0', number: 26, group: 'arduino-analog',
    x: 16, y: 19, side: 'bottom',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  // AREF and extra GND near analog header
  {
    id: 'AREF_S', name: 'AREF', number: 27, group: 'arduino-analog',
    x: 14, y: 19, side: 'bottom',
    type: 'analog', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'GND_S3', name: 'GND', number: 28, group: 'arduino-analog',
    x: 13, y: 19, side: 'bottom',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },

  // ---- MORPHO HEADER — LEFT SIDE (additional pins) ----
  // Key Morpho pins that are most commonly used
  {
    id: 'PA11_M', name: 'PA11 / USB_DM', number: 29, group: 'morpho-left',
    x: 0.5, y: 13, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'USB_DM', protocol: 'USB' }],
    defaultState: 'floating',
  },
  {
    id: 'PA12_M', name: 'PA12 / USB_DP', number: 30, group: 'morpho-left',
    x: 0.5, y: 14, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'USB_DP', protocol: 'USB' }],
    defaultState: 'floating',
  },
  {
    id: 'PA13_M', name: 'PA13 / SWDIO', number: 31, group: 'morpho-left',
    x: 0.5, y: 15, side: 'left',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'SWDIO', protocol: 'SWD' }],
    defaultState: 'floating',
  },
  {
    id: 'PB9_M', name: 'PB9', number: 32, group: 'morpho-left',
    x: 0.5, y: 16, side: 'left',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SDA', protocol: 'I2C' },
      { name: 'TIM4_CH4', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB8_M', name: 'PB8', number: 33, group: 'morpho-left',
    x: 0.5, y: 17, side: 'left',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'TIM4_CH3', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PC6_M', name: 'PC6', number: 34, group: 'morpho-left',
    x: 0.5, y: 18, side: 'left',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'TIM3_CH1', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'PC7_M', name: 'PC7', number: 35, group: 'morpho-left',
    x: 0.5, y: 19, side: 'left',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'TIM3_CH2', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'PC8_M', name: 'PC8', number: 36, group: 'morpho-left',
    x: 0.5, y: 20, side: 'left',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'TIM3_CH3', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'PC9_M', name: 'PC9', number: 37, group: 'morpho-left',
    x: 0.5, y: 21, side: 'left',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [{ name: 'TIM3_CH4', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'PA15_M', name: 'PA15', number: 38, group: 'morpho-left',
    x: 0.5, y: 22, side: 'left',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [
      { name: 'SPI1_NSS', protocol: 'SPI' },
      { name: 'TIM2_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB3_M', name: 'PB3 / TRACESWO', number: 39, group: 'morpho-left',
    x: 0.5, y: 23, side: 'left',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'SPI1_SCK', protocol: 'SPI' },
      { name: 'TRACESWO', protocol: 'SWD' },
      { name: 'TIM2_CH2', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB4_M', name: 'PB4', number: 40, group: 'morpho-left',
    x: 0.5, y: 24, side: 'left',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'SPI1_MISO', protocol: 'SPI' },
      { name: 'TIM3_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB5_M', name: 'PB5', number: 41, group: 'morpho-left',
    x: 0.5, y: 25, side: 'left',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'SPI1_MOSI', protocol: 'SPI' },
      { name: 'I2C1_SMBA', protocol: 'I2C' },
      { name: 'TIM3_CH2', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB6_M', name: 'PB6', number: 42, group: 'morpho-left',
    x: 0.5, y: 26, side: 'left',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'TIM4_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB7_M', name: 'PB7', number: 43, group: 'morpho-left',
    x: 0.5, y: 27, side: 'left',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C1_SDA', protocol: 'I2C' },
      { name: 'TIM4_CH2', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },

  // ---- MORPHO HEADER — RIGHT SIDE (additional pins) ----
  {
    id: 'PD2_M', name: 'PD2', number: 44, group: 'morpho-right',
    x: 25.5, y: 5, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'TIM3_ETR', protocol: 'PWM' }],
    defaultState: 'floating',
  },
  {
    id: 'PC12_M', name: 'PC12', number: 45, group: 'morpho-right',
    x: 25.5, y: 6, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'SPI3_MOSI', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'PC10_M', name: 'PC10', number: 46, group: 'morpho-right',
    x: 25.5, y: 7, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [
      { name: 'SPI3_SCK', protocol: 'SPI' },
      { name: 'UART4_TX', protocol: 'UART' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PC11_M', name: 'PC11', number: 47, group: 'morpho-right',
    x: 25.5, y: 8, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [
      { name: 'SPI3_MISO', protocol: 'SPI' },
      { name: 'UART4_RX', protocol: 'UART' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PA14_M', name: 'PA14', number: 48, group: 'morpho-right',
    x: 25.5, y: 10, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'PA10_M', name: 'PA10', number: 49, group: 'morpho-right',
    x: 25.5, y: 11, side: 'right',
    type: 'digital', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [
      { name: 'TIM1_CH3', protocol: 'PWM' },
      { name: 'I2C2_SCL', protocol: 'I2C' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PA9_M', name: 'PA9', number: 50, group: 'morpho-right',
    x: 25.5, y: 12, side: 'right',
    type: 'uart', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'USART1_TX', protocol: 'UART' },
      { name: 'TIM1_CH2', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PA8_M', name: 'PA8', number: 51, group: 'morpho-right',
    x: 25.5, y: 13, side: 'right',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'TIM1_CH1', protocol: 'PWM' },
      { name: 'I2C1_SCL', protocol: 'I2C' },
      { name: 'MCO', protocol: 'CLOCK' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PC9_M2', name: 'PC9', number: 52, group: 'morpho-right',
    x: 25.5, y: 14, side: 'right',
    type: 'pwm', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'TIM3_CH4', protocol: 'PWM' },
      { name: 'MCO2', protocol: 'CLOCK' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PA0_M', name: 'PA0 / ADC0', number: 53, group: 'morpho-right',
    x: 25.5, y: 15, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [
      { name: 'TIM2_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PA1_M', name: 'PA1 / ADC1', number: 54, group: 'morpho-right',
    x: 25.5, y: 16, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [
      { name: 'TIM2_CH2', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PA4_M', name: 'PA4 / DAC1', number: 55, group: 'morpho-right',
    x: 25.5, y: 17, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [
      { name: 'DAC_OUT1', protocol: 'ANALOG' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB0_M', name: 'PB0 / ADC8', number: 56, group: 'morpho-right',
    x: 25.5, y: 18, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [
      { name: 'TIM3_CH3', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PC1_M', name: 'PC1 / ADC11', number: 57, group: 'morpho-right',
    x: 25.5, y: 19, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'PC0_M', name: 'PC0 / ADC10', number: 58, group: 'morpho-right',
    x: 25.5, y: 20, side: 'right',
    type: 'adc', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [],
    defaultState: 'floating',
  },
  {
    id: 'PA5_M', name: 'PA5', number: 59, group: 'morpho-right',
    x: 25.5, y: 21, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'ADC'],
    altFunctions: [
      { name: 'SPI1_SCK', protocol: 'SPI' },
      { name: 'TIM2_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PA6_M', name: 'PA6', number: 60, group: 'morpho-right',
    x: 25.5, y: 22, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'PWM'],
    altFunctions: [
      { name: 'SPI1_MISO', protocol: 'SPI' },
      { name: 'TIM3_CH1', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PA7_M', name: 'PA7', number: 61, group: 'morpho-right',
    x: 25.5, y: 23, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT', 'ADC', 'PWM'],
    altFunctions: [
      { name: 'SPI1_MOSI', protocol: 'SPI' },
      { name: 'TIM1_CH1N', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB10_M', name: 'PB10', number: 62, group: 'morpho-right',
    x: 25.5, y: 24, side: 'right',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT', 'PWM'],
    altFunctions: [
      { name: 'I2C2_SCL', protocol: 'I2C' },
      { name: 'SPI2_SCK', protocol: 'SPI' },
      { name: 'TIM2_CH3', protocol: 'PWM' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB11_M', name: 'PB11', number: 63, group: 'morpho-right',
    x: 25.5, y: 25, side: 'right',
    type: 'i2c', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [
      { name: 'I2C2_SDA', protocol: 'I2C' },
      { name: 'SPI2_MISO', protocol: 'SPI' },
    ],
    defaultState: 'floating',
  },
  {
    id: 'PB12_M', name: 'PB12', number: 64, group: 'morpho-right',
    x: 25.5, y: 26, side: 'right',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [
      { name: 'SPI2_NSS', protocol: 'SPI' },
      { name: 'I2C2_SMBA', protocol: 'I2C' },
    ],
    defaultState: 'floating',
  },

  // ---- ICSP HEADER for STM32 ----
  {
    id: 'ICSP_S_MISO', name: 'ICSP MISO', number: 65, group: 'icsp',
    x: 12, y: 8, side: 'top',
    type: 'spi', capabilities: ['INPUT'],
    altFunctions: [{ name: 'MISO', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'ICSP_S_VCC', name: 'ICSP 5V', number: 66, group: 'icsp',
    x: 12, y: 9, side: 'top',
    type: 'power', capabilities: ['POWER'],
    altFunctions: [],
    defaultState: 'high', defaultVoltage: 5,
  },
  {
    id: 'ICSP_S_SCK', name: 'ICSP SCK', number: 67, group: 'icsp',
    x: 12, y: 10, side: 'top',
    type: 'spi', capabilities: ['INPUT', 'OUTPUT'],
    altFunctions: [{ name: 'SCK', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'ICSP_S_MOSI', name: 'ICSP MOSI', number: 68, group: 'icsp',
    x: 13, y: 8, side: 'top',
    type: 'spi', capabilities: ['OUTPUT'],
    altFunctions: [{ name: 'MOSI', protocol: 'SPI' }],
    defaultState: 'floating',
  },
  {
    id: 'ICSP_S_RESET', name: 'ICSP RESET', number: 69, group: 'icsp',
    x: 13, y: 9, side: 'top',
    type: 'digital', capabilities: ['INPUT'],
    altFunctions: [],
    defaultState: 'high',
  },
  {
    id: 'ICSP_S_GND', name: 'ICSP GND', number: 70, group: 'icsp',
    x: 13, y: 10, side: 'top',
    type: 'ground', capabilities: ['GROUND'],
    altFunctions: [],
    defaultState: 'low',
  },
];

const stm32Groups: PinGroup[] = [
  {
    id: 'arduino-power', name: 'Arduino Power', side: 'left',
    pinIds: ['IOREF_S', 'RESET_S', '3V3_S', '5V_S', 'GND_S1', 'GND_S2', 'VIN_S'],
    color: '#ef4444',
  },
  {
    id: 'arduino-digital', name: 'Arduino Digital', side: 'top',
    pinIds: ['D0_S', 'D1_S', 'D2_S', 'D3_S', 'D4_S', 'D5_S', 'D6_S', 'D7_S',
             'D8_S', 'D9_S', 'D10_S', 'D11_S', 'D12_S', 'D13_S'],
    color: '#3b82f6',
  },
  {
    id: 'arduino-analog', name: 'Arduino Analog', side: 'bottom',
    pinIds: ['A0_S', 'A1_S', 'A2_S', 'A3_S', 'A4_S', 'A5_S', 'AREF_S', 'GND_S3'],
    color: '#22c55e',
  },
  {
    id: 'morpho-left', name: 'Morpho (L)', side: 'left',
    pinIds: [
      'PA11_M', 'PA12_M', 'PA13_M', 'PB9_M', 'PB8_M', 'PC6_M', 'PC7_M', 'PC8_M',
      'PC9_M', 'PA15_M', 'PB3_M', 'PB4_M', 'PB5_M', 'PB6_M', 'PB7_M',
    ],
    color: '#a855f7',
  },
  {
    id: 'morpho-right', name: 'Morpho (R)', side: 'right',
    pinIds: [
      'PD2_M', 'PC12_M', 'PC10_M', 'PC11_M', 'PA14_M', 'PA10_M', 'PA9_M', 'PA8_M',
      'PC9_M2', 'PA0_M', 'PA1_M', 'PA4_M', 'PB0_M', 'PC1_M', 'PC0_M',
      'PA5_M', 'PA6_M', 'PA7_M', 'PB10_M', 'PB11_M', 'PB12_M',
    ],
    color: '#a855f7',
  },
  {
    id: 'icsp', name: 'ICSP', side: 'top',
    pinIds: ['ICSP_S_MISO', 'ICSP_S_VCC', 'ICSP_S_SCK', 'ICSP_S_MOSI', 'ICSP_S_RESET', 'ICSP_S_GND'],
    color: '#a855f7',
  },
];

const stm32Features: BoardFeature[] = [
  {
    type: 'usb', id: 'usb-micro-stm32', name: 'USB Micro-B',
    x: 4, y: 5.5, width: 3, height: 3, color: '#94a3b8',
    label: 'Micro-USB',
  },
  {
    type: 'chip', id: 'stm32-mcu', name: 'STM32F411RE',
    x: 10, y: 12, width: 5, height: 5, color: '#1e293b',
    label: 'STM32F411RE',
  },
  {
    type: 'chip', id: 'stlink', name: 'ST-Link',
    x: 0.5, y: 2, width: 5, height: 4, color: '#374151',
    label: 'ST-Link V2-1',
  },
  {
    type: 'led', id: 'led-builtin-stm32', name: 'Built-in LED (LD2)',
    x: 21, y: 4.5, width: 0.8, height: 0.8, color: '#22c55e',
    label: 'LD2',
  },
  {
    type: 'led', id: 'led-usr-stm32', name: 'User LED (LD1)',
    x: 4, y: 2, width: 0.8, height: 0.8, color: '#3b82f6',
    label: 'LD1',
  },
  {
    type: 'led', id: 'led-com-stm32', name: 'Communication LED (LD3)',
    x: 5, y: 2, width: 0.8, height: 0.8, color: '#facc15',
    label: 'LD3',
  },
  {
    type: 'button', id: 'btn-reset-stm32', name: 'Reset Button',
    x: 5, y: 10, width: 1.5, height: 1.5, color: '#64748b',
    label: 'RESET',
  },
  {
    type: 'button', id: 'btn-user-stm32', name: 'User Button (B1)',
    x: 22, y: 10, width: 1.5, height: 1.5, color: '#64748b',
    label: 'USER',
  },
  {
    type: 'jumper', id: 'jp1', name: 'JP1 - ST-Link Power',
    x: 6, y: 7, width: 1.5, height: 0.8, color: '#f59e0b',
    label: 'JP1',
  },
  {
    type: 'jumper', id: 'jp2', name: 'JP2 - Boot Mode',
    x: 6, y: 8, width: 1.5, height: 0.8, color: '#f59e0b',
    label: 'JP2',
  },
  {
    type: 'regulator', id: 'regulator-stm32', name: 'LDO Regulator',
    x: 8, y: 8, width: 1.2, height: 1.5, color: '#1e293b',
  },
  {
    type: 'crystal', id: 'crystal-stm32', name: '8MHz Crystal',
    x: 8, y: 11, width: 1.2, height: 0.6, color: '#94a3b8',
    label: '8MHz',
  },
  {
    type: 'header', id: 'morpho-left-header', name: 'Morpho Left Header',
    x: 0.5, y: 12.5, width: 1, height: 15, color: '#1e293b',
    label: 'MORPHO',
  },
  {
    type: 'header', id: 'morpho-right-header', name: 'Morpho Right Header',
    x: 24.5, y: 4.5, width: 1, height: 23, color: '#1e293b',
    label: 'MORPHO',
  },
];

const stm32Nucleo: BoardPinout = {
  boardId: 'stm32-nucleo-f411re',
  boardName: 'STM32 Nucleo-F411RE',
  boardWidth: 26,
  boardHeight: 29,
  boardColor: '#2D1B69',
  usbType: 'micro-usb',
  pins: stm32Pins,
  pinGroups: stm32Groups,
  features: stm32Features,
};

// ========================== BOARD DATABASE ==========================

const allBoards: BoardPinout[] = [
  arduinoUno,
  arduinoNano,
  esp32DevKit,
  picoBoard,
  stm32Nucleo,
];

// Build a quick-lookup map for pin hit-testing
const pinLookupMap = new Map<string, BoardPinout>();
const pinPositionIndex = new Map<string, PinDefinition[]>();

for (const board of allBoards) {
  pinLookupMap.set(board.boardId, board);
  pinPositionIndex.set(board.boardId, board.pins);
}

// ========================== EXPORTED FUNCTIONS ==========================

/**
 * Get the complete pinout data for a specific board.
 * @param boardId  Board identifier string (e.g. "arduino-uno", "esp32-devkit")
 * @returns Full BoardPinout object or null if not found
 */
export function getBoardPinout(boardId: string): BoardPinout | null {
  return pinLookupMap.get(boardId) ?? null;
}

/**
 * Get pinout data for all registered boards.
 * @returns Array of BoardPinout objects
 */
export function getAllBoardPinouts(): BoardPinout[] {
  return allBoards;
}

/**
 * Hit-test: find a pin near a given (x, y) position on a board.
 * Useful for detecting which pin the user clicked on in the SVG canvas.
 *
 * @param boardId    Board identifier
 * @param x          X coordinate in board units
 * @param y          Y coordinate in board units
 * @param tolerance  Search radius in board units (default 0.5 = half a header pitch)
 * @returns Nearest PinDefinition within tolerance, or null if none found
 */
export function getPinByPosition(
  boardId: string,
  x: number,
  y: number,
  tolerance: number = 0.5,
): PinDefinition | null {
  const pins = pinPositionIndex.get(boardId);
  if (!pins) return null;

  let closestPin: PinDefinition | null = null;
  let closestDist = Infinity;

  for (const pin of pins) {
    const dx = pin.x - x;
    const dy = pin.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < closestDist && dist <= tolerance) {
      closestDist = dist;
      closestPin = pin;
    }
  }

  return closestPin;
}

/**
 * Get a specific pin by its ID for a given board.
 * @param boardId  Board identifier
 * @param pinId    Pin ID (e.g. "D13", "GP0", "A4")
 * @returns PinDefinition or null
 */
export function getPinById(boardId: string, pinId: string): PinDefinition | null {
  const board = pinLookupMap.get(boardId);
  if (!board) return null;
  return board.pins.find((p) => p.id === pinId) ?? null;
}

/**
 * Get all pins of a specific type for a board.
 * Useful for filtering: e.g. get all PWM pins, all ground pins, etc.
 * @param boardId  Board identifier
 * @param pinType  Pin type to filter by
 * @returns Array of matching PinDefinitions
 */
export function getPinsByType(boardId: string, pinType: PinDefinition['type']): PinDefinition[] {
  const board = pinLookupMap.get(boardId);
  if (!board) return [];
  return board.pins.filter((p) => p.type === pinType);
}

/**
 * Get all pins that have a specific capability.
 * E.g. getPinsByCapability("arduino-uno", "PWM") returns [D3, D5, D6, D9, D10, D11]
 * @param boardId      Board identifier
 * @param capability   Capability string (e.g. "PWM", "ADC", "I2C")
 * @returns Array of matching PinDefinitions
 */
export function getPinsByCapability(boardId: string, capability: string): PinDefinition[] {
  const board = pinLookupMap.get(boardId);
  if (!board) return [];
  return board.pins.filter((p) => p.capabilities.includes(capability));
}

/**
 * Get all pins belonging to a specific pin group.
 * @param boardId  Board identifier
 * @param groupId  Pin group ID
 * @returns Array of PinDefinitions in that group
 */
export function getPinsByGroup(boardId: string, groupId: string): PinDefinition[] {
  const board = pinLookupMap.get(boardId);
  if (!board) return [];
  const group = board.pinGroups.find((g) => g.id === groupId);
  if (!group) return [];
  return group.pinIds
    .map((id) => board.pins.find((p) => p.id === id))
    .filter((p): p is PinDefinition => p !== undefined);
}

/**
 * Check whether a pin supports a specific protocol via alternate function.
 * @param boardId    Board identifier
 * @param pinId      Pin ID
 * @param protocol   Protocol to check (e.g. "I2C", "SPI", "UART")
 * @returns true if the pin has an alt function for the given protocol
 */
export function pinHasProtocol(boardId: string, pinId: string, protocol: string): boolean {
  const pin = getPinById(boardId, pinId);
  if (!pin) return false;
  return pin.altFunctions.some((af) => af.protocol === protocol);
}

/**
 * Get all board IDs that are registered in the database.
 */
export function getBoardIds(): string[] {
  return allBoards.map((b) => b.boardId);
}

/**
 * Summary statistics for a board — useful for display in the UI.
 */
export function getBoardSummary(boardId: string): {
  totalPins: number;
  digitalPins: number;
  analogPins: number;
  pwmPins: number;
  spiPins: number;
  i2cPins: number;
  uartPins: number;
  powerPins: number;
  groundPins: number;
} | null {
  const board = pinLookupMap.get(boardId);
  if (!board) return null;

  const pins = board.pins;
  return {
    totalPins: pins.length,
    digitalPins: getPinsByCapability(boardId, 'INPUT').length + getPinsByCapability(boardId, 'OUTPUT').length,
    analogPins: getPinsByCapability(boardId, 'ADC').length,
    pwmPins: getPinsByCapability(boardId, 'PWM').length,
    spiPins: pins.filter((p) => pinHasProtocol(boardId, p.id, 'SPI')).length,
    i2cPins: pins.filter((p) => pinHasProtocol(boardId, p.id, 'I2C')).length,
    uartPins: pins.filter((p) => pinHasProtocol(boardId, p.id, 'UART')).length,
    powerPins: getPinsByCapability(boardId, 'POWER').length,
    groundPins: getPinsByCapability(boardId, 'GROUND').length,
  };
}
