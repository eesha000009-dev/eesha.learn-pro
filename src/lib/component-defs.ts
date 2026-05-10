import type { ComponentDef, Pin } from '@/types';

// ─── Pin Helpers ──────────────────────────────────────────────────────────

function dPin(id: string, label: string, offset: [number, number], side: Pin['side']): Pin {
  return { id, label, offset: { x: offset[0], y: offset[1] }, side, type: 'digital', value: 0, mode: 'bidirectional' };
}
function aPin(id: string, label: string, offset: [number, number], side: Pin['side']): Pin {
  return { id, label, offset: { x: offset[0], y: offset[1] }, side, type: 'analog', value: 0, mode: 'input' };
}
function pwrPin(id: string, label: string, offset: [number, number], side: Pin['side']): Pin {
  return { id, label, offset: { x: offset[0], y: offset[1] }, side, type: 'power', value: 5, mode: 'output' };
}
function gndPin(id: string, label: string, offset: [number, number], side: Pin['side']): Pin {
  return { id, label, offset: { x: offset[0], y: offset[1] }, side, type: 'ground', value: 0, mode: 'output' };
}

// ─── Arduino UNO ──────────────────────────────────────────────────────────
// Pin layout matches the real Arduino UNO R3:
// Left side (top to bottom): AREF, GND, 13, 12, 11, 10, 9, 8
// Right side (top to bottom): 5V, 3.3V, RST, GND, GND, VIN, A0, A1, A2, A3, A4, A5
// Board dimensions: ~68.6mm x 53.4mm -> we use ~280x210 px

const ARDUINO_PINS: Pin[] = [
  // Left side (Power header)
  pwrPin('5v', '5V', [0, 20], 'left'),
  pwrPin('3v3', '3.3V', [0, 40], 'left'),
  dPin('rst', 'RST', [0, 60], 'left'),
  gndPin('gnd1', 'GND', [0, 80], 'left'),
  gndPin('gnd2', 'GND', [0, 100], 'left'),
  pwrPin('vin', 'VIN', [0, 120], 'left'),

  // Left side bottom - Analog pins
  aPin('a0', 'A0', [0, 150], 'left'),
  aPin('a1', 'A1', [0, 170], 'left'),
  aPin('a2', 'A2', [0, 190], 'left'),
  aPin('a3', 'A3', [0, 210], 'left'),
  aPin('a4', 'A4/SDA', [0, 230], 'left'),
  aPin('a5', 'A5/SCL', [0, 250], 'left'),

  // Right side - Digital pins
  dPin('d0', 'D0/RX', [280, 20], 'right'),
  dPin('d1', 'D1/TX', [280, 40], 'right'),
  dPin('d2', 'D2', [280, 60], 'right'),
  dPin('d3', 'D3~', [280, 80], 'right'),
  dPin('d4', 'D4', [280, 100], 'right'),
  dPin('d5', 'D5~', [280, 120], 'right'),
  dPin('d6', 'D6~', [280, 140], 'right'),
  dPin('d7', 'D7', [280, 160], 'right'),
  dPin('d8', 'D8', [280, 180], 'right'),
  dPin('d9', 'D9~', [280, 200], 'right'),
  dPin('d10', 'D10~', [280, 220], 'right'),
  dPin('d11', 'D11~', [280, 240], 'right'),
  dPin('d12', 'D12', [280, 260], 'right'),
  dPin('d13', 'D13', [280, 280], 'right'),
];

export const ARDUINO_UNO_DEF: ComponentDef = {
  type: 'arduino-uno',
  name: 'Arduino UNO R3',
  category: 'board',
  description: 'ATmega328P-based development board',
  width: 280,
  height: 300,
  pins: ARDUINO_PINS,
  defaultX: 300,
  defaultY: 200,
};

// ─── LED ───────────────────────────────────────────────────────────────────

const LED_PINS: Pin[] = [
  dPin('anode', 'Anode (+)', [20, 0], 'top'),
  gndPin('cathode', 'Cathode (-)', [60, 0], 'top'),
];

const LED_DEF: ComponentDef = {
  type: 'led-red',
  name: 'LED (Red)',
  category: 'passive',
  description: 'Standard red LED',
  width: 40,
  height: 30,
  pins: LED_PINS,
  defaultX: 650,
  defaultY: 300,
};

const LED_GREEN_DEF: ComponentDef = {
  ...LED_DEF,
  type: 'led-green',
  name: 'LED (Green)',
};

const LED_BLUE_DEF: ComponentDef = {
  ...LED_DEF,
  type: 'led-blue',
  name: 'LED (Blue)',
};

const LED_YELLOW_DEF: ComponentDef = {
  ...LED_DEF,
  type: 'led-yellow',
  name: 'LED (Yellow)',
};

// ─── Resistor ─────────────────────────────────────────────────────────────

const RESISTOR_PINS: Pin[] = [
  dPin('pin1', '1', [0, 15], 'left'),
  dPin('pin2', '2', [80, 15], 'right'),
];

const RESISTOR_DEF: ComponentDef = {
  type: 'resistor',
  name: 'Resistor (220Ω)',
  category: 'passive',
  description: '220Ω resistor',
  width: 80,
  height: 30,
  pins: RESISTOR_PINS,
  defaultX: 550,
  defaultY: 300,
};

// ─── Push Button ──────────────────────────────────────────────────────────

const BUTTON_PINS: Pin[] = [
  dPin('pin1', '1', [10, 0], 'top'),
  dPin('pin2', '2', [50, 0], 'top'),
  dPin('pin3', '3', [10, 40], 'bottom'),
  dPin('pin4', '4', [50, 40], 'bottom'),
];

const BUTTON_DEF: ComponentDef = {
  type: 'push-button',
  name: 'Push Button',
  category: 'passive',
  description: 'Momentary push button switch',
  width: 60,
  height: 40,
  pins: BUTTON_PINS,
  defaultX: 600,
  defaultY: 400,
};

// ─── Buzzer ───────────────────────────────────────────────────────────────

const BUZZER_PINS: Pin[] = [
  dPin('pos', '+', [20, 0], 'top'),
  gndPin('neg', '-', [50, 0], 'top'),
];

const BUZZER_DEF: ComponentDef = {
  type: 'buzzer',
  name: 'Piezo Buzzer',
  category: 'actuator',
  description: 'Active piezo buzzer',
  width: 50,
  height: 30,
  pins: BUZZER_PINS,
  defaultX: 650,
  defaultY: 500,
};

// ─── LCD 16x2 ─────────────────────────────────────────────────────────────

const LCD_PINS: Pin[] = [
  dPin('vss', 'VSS', [0, 10], 'left'),
  pwrPin('vdd', 'VDD', [0, 30], 'left'),
  dPin('v0', 'V0', [0, 50], 'left'),
  dPin('rs', 'RS', [0, 70], 'left'),
  dPin('rw', 'RW', [0, 90], 'left'),
  dPin('e', 'E', [0, 110], 'left'),
  dPin('d0', 'D0', [0, 130], 'left'),
  dPin('d1', 'D1', [0, 150], 'left'),
  dPin('d2', 'D2', [0, 170], 'left'),
  dPin('d3', 'D3', [0, 190], 'left'),
  dPin('d4', 'D4', [0, 210], 'left'),
  dPin('d5', 'D5', [0, 230], 'left'),
  dPin('d6', 'D6', [0, 250], 'left'),
  dPin('d7', 'D7', [0, 270], 'left'),
  pwrPin('a', 'A', [0, 290], 'left'),
  gndPin('k', 'K', [0, 310], 'left'),
];

const LCD_DEF: ComponentDef = {
  type: 'lcd-16x2',
  name: 'LCD 16x2 (I2C)',
  category: 'display',
  description: '16x2 character LCD with I2C backpack',
  width: 120,
  height: 320,
  pins: [
    pwrPin('vcc', 'VCC', [0, 20], 'left'),
    gndPin('gnd', 'GND', [0, 45], 'left'),
    dPin('sda', 'SDA', [0, 70], 'left'),
    dPin('scl', 'SCL', [0, 95], 'left'),
  ],
  defaultX: 700,
  defaultY: 150,
};

// ─── Photoresistor (LDR) ──────────────────────────────────────────────────

const LDR_PINS: Pin[] = [
  dPin('pin1', '1', [15, 0], 'top'),
  dPin('pin2', '2', [45, 0], 'top'),
];

const LDR_DEF: ComponentDef = {
  type: 'photoresistor',
  name: 'Photoresistor (LDR)',
  category: 'sensor',
  description: 'Light-dependent resistor',
  width: 60,
  height: 30,
  pins: LDR_PINS,
  defaultX: 600,
  defaultY: 250,
};

// ─── DHT22 Sensor ─────────────────────────────────────────────────────────

const DHT22_PINS: Pin[] = [
  pwrPin('vcc', 'VCC', [20, 0], 'top'),
  dPin('dat', 'DATA', [50, 0], 'top'),
  gndPin('gnd', 'GND', [80, 0], 'top'),
];

const DHT22_DEF: ComponentDef = {
  type: 'dht22',
  name: 'DHT22 Temp/Humidity',
  category: 'sensor',
  description: 'Temperature and humidity sensor',
  width: 80,
  height: 40,
  pins: DHT22_PINS,
  defaultX: 650,
  defaultY: 400,
};

// ─── Servo Motor ──────────────────────────────────────────────────────────

const SERVO_PINS: Pin[] = [
  pwrPin('vcc', 'VCC (Red)', [20, 0], 'top'),
  dPin('sig', 'Signal (Orange)', [50, 0], 'top'),
  gndPin('gnd', 'GND (Brown)', [80, 0], 'top'),
];

const SERVO_DEF: ComponentDef = {
  type: 'servo-motor',
  name: 'Servo Motor (SG90)',
  category: 'actuator',
  description: 'Standard servo motor',
  width: 80,
  height: 50,
  pins: SERVO_PINS,
  defaultX: 700,
  defaultY: 350,
};

// ─── Potentiometer ────────────────────────────────────────────────────────

const POT_PINS: Pin[] = [
  dPin('pin1', '1', [0, 15], 'left'),
  dPin('wiper', 'Wiper', [45, 30], 'bottom'),
  dPin('pin3', '3', [90, 15], 'right'),
];

const POT_DEF: ComponentDef = {
  type: 'potentiometer',
  name: 'Potentiometer (10kΩ)',
  category: 'passive',
  description: '10kΩ rotary potentiometer',
  width: 90,
  height: 30,
  pins: POT_PINS,
  defaultX: 550,
  defaultY: 450,
};

// ─── RGB LED ──────────────────────────────────────────────────────────────

const RGB_LED_PINS: Pin[] = [
  dPin('red', 'R', [10, 0], 'top'),
  gndPin('gnd', 'GND', [35, 0], 'top'),
  dPin('green', 'G', [60, 0], 'top'),
  dPin('blue', 'B', [85, 0], 'top'),
];

const RGB_LED_DEF: ComponentDef = {
  type: 'rgb-led',
  name: 'RGB LED',
  category: 'passive',
  description: 'Common cathode RGB LED',
  width: 80,
  height: 30,
  pins: RGB_LED_PINS,
  defaultX: 650,
  defaultY: 500,
};

// ─── Ultrasonic Sensor (HC-SR04) ──────────────────────────────────────────

const ULTRASONIC_PINS: Pin[] = [
  pwrPin('vcc', 'VCC', [20, 0], 'top'),
  dPin('trig', 'TRIG', [55, 0], 'top'),
  dPin('echo', 'ECHO', [90, 0], 'top'),
  gndPin('gnd', 'GND', [125, 0], 'top'),
];

const ULTRASONIC_DEF: ComponentDef = {
  type: 'ultrasonic-hc-sr04',
  name: 'HC-SR04 Ultrasonic',
  category: 'sensor',
  description: 'Ultrasonic distance sensor',
  width: 140,
  height: 40,
  pins: ULTRASONIC_PINS,
  defaultX: 600,
  defaultY: 550,
};

// ─── All Definitions ──────────────────────────────────────────────────────

export const BOARD_DEFINITIONS: ComponentDef[] = [ARDUINO_UNO_DEF];

export const COMPONENT_DEFINITIONS: ComponentDef[] = [
  ARDUINO_UNO_DEF,
  LED_DEF,
  LED_GREEN_DEF,
  LED_BLUE_DEF,
  LED_YELLOW_DEF,
  RESISTOR_DEF,
  BUTTON_DEF,
  BUZZER_DEF,
  LCD_DEF,
  LDR_DEF,
  DHT22_DEF,
  SERVO_DEF,
  POT_DEF,
  RGB_LED_DEF,
  ULTRASONIC_DEF,
];

export const COMPONENT_CATEGORIES = [
  { id: 'board', name: 'Boards', icon: '🔲' },
  { id: 'display', name: 'Displays', icon: '📺' },
  { id: 'sensor', name: 'Sensors', icon: '📡' },
  { id: 'actuator', name: 'Actuators', icon: '⚙️' },
  { id: 'passive', name: 'Passive', icon: '🔋' },
  { id: 'communication', name: 'Communication', icon: '📶' },
  { id: 'power', name: 'Power', icon: '⚡' },
];

// ─── Wire Colors ──────────────────────────────────────────────────────────

export const WIRE_COLORS = [
  { name: 'Red', color: '#ef4444' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'White', color: '#f5f5f5' },
  { name: 'Black', color: '#27272a' },
  { name: 'Gray', color: '#71717a' },
  { name: 'Pink', color: '#ec4899' },
];
