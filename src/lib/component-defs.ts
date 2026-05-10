import type { ComponentDef, Pin } from '@/types';

// Based on wokwi-elements (MIT License) - Copyright (c) 2020 Uri Shaked
// https://github.com/wokwi/wokwi-elements

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
// Pin positions match the Wokwi SVG rendering (viewBox "-4 0 72.58 53.34" scaled ~4px/mm)
// Board: 290px × 213px
// Top pins (y=10): Digital 13–0 (left to right, matching Wokwi header layout)
// Bottom pins (y=203): RESET, 3.3V, 5V, GND×2, VIN | A0–A5

const ARDUINO_PINS: Pin[] = [
  // Bottom side - Power header (left to right)
  dPin('rst', 'RST', [138, 203], 'bottom'),
  pwrPin('3v3', '3.3V', [148, 203], 'bottom'),
  pwrPin('5v', '5V', [158, 203], 'bottom'),
  gndPin('gnd1', 'GND', [168, 203], 'bottom'),
  gndPin('gnd2', 'GND', [178, 203], 'bottom'),
  pwrPin('vin', 'VIN', [189, 203], 'bottom'),

  // Bottom side - Analog header
  aPin('a0', 'A0', [219, 203], 'bottom'),
  aPin('a1', 'A1', [229, 203], 'bottom'),
  aPin('a2', 'A2', [239, 203], 'bottom'),
  aPin('a3', 'A3', [249, 203], 'bottom'),
  aPin('a4', 'A4/SDA', [260, 203], 'bottom'),
  aPin('a5', 'A5/SCL', [270, 203], 'bottom'),

  // Top side - Digital pins (left to right matching Wokwi header)
  dPin('d13', 'D13', [132, 10], 'top'),
  dPin('d12', 'D12', [142, 10], 'top'),
  dPin('d11', 'D11~', [152, 10], 'top'),
  dPin('d10', 'D10~', [162, 10], 'top'),
  dPin('d9', 'D9~', [172, 10], 'top'),
  dPin('d8', 'D8', [182, 10], 'top'),
  dPin('d7', 'D7', [199, 10], 'top'),
  dPin('d6', 'D6~', [209, 10], 'top'),
  dPin('d5', 'D5~', [219, 10], 'top'),
  dPin('d4', 'D4', [229, 10], 'top'),
  dPin('d3', 'D3~', [239, 10], 'top'),
  dPin('d2', 'D2', [250, 10], 'top'),
  dPin('d1', 'D1/TX', [260, 10], 'top'),
  dPin('d0', 'D0/RX', [270, 10], 'top'),
];

export const ARDUINO_UNO_DEF: ComponentDef = {
  type: 'arduino-uno',
  name: 'Arduino UNO R3',
  category: 'board',
  description: 'ATmega328P-based development board',
  width: 290,
  height: 213,
  pins: ARDUINO_PINS,
  defaultX: 300,
  defaultY: 200,
};

// ─── LED ───────────────────────────────────────────────────────────────────

const LED_PINS: Pin[] = [
  dPin('anode', 'Anode (+)', [5, 30], 'bottom'),
  gndPin('cathode', 'Cathode (-)', [15, 30], 'bottom'),
];

const LED_DEF: ComponentDef = {
  type: 'led-red',
  name: 'LED (Red)',
  category: 'passive',
  description: 'Standard red LED',
  width: 20,
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
  dPin('pin1', '1', [0, 1.5], 'left'),
  dPin('pin2', '2', [15.6, 1.5], 'right'),
];

const RESISTOR_DEF: ComponentDef = {
  type: 'resistor',
  name: 'Resistor (220Ω)',
  category: 'passive',
  description: '220Ω resistor',
  width: 16,
  height: 3,
  pins: RESISTOR_PINS,
  defaultX: 550,
  defaultY: 300,
};

// ─── Push Button ──────────────────────────────────────────────────────────

const BUTTON_PINS: Pin[] = [
  dPin('pin1', '1', [0, 13], 'left'),
  dPin('pin2', '2', [0, 35], 'left'),
  dPin('pin3', '3', [48, 13], 'right'),
  dPin('pin4', '4', [48, 35], 'right'),
];

const BUTTON_DEF: ComponentDef = {
  type: 'push-button',
  name: 'Push Button',
  category: 'passive',
  description: 'Momentary push button switch',
  width: 60,
  height: 48,
  pins: BUTTON_PINS,
  defaultX: 600,
  defaultY: 400,
};

// ─── Buzzer ───────────────────────────────────────────────────────────────

const BUZZER_PINS: Pin[] = [
  dPin('pos', '+', [28.92, 80], 'bottom'),
  gndPin('neg', '-', [39.08, 80], 'bottom'),
];

const BUZZER_DEF: ComponentDef = {
  type: 'buzzer',
  name: 'Piezo Buzzer',
  category: 'actuator',
  description: 'Active piezo buzzer',
  width: 68,
  height: 80,
  pins: BUZZER_PINS,
  defaultX: 650,
  defaultY: 500,
};

// ─── LCD 16x2 ─────────────────────────────────────────────────────────────

const LCD_DEF: ComponentDef = {
  type: 'lcd-16x2',
  name: 'LCD 16x2 (I2C)',
  category: 'display',
  description: '16x2 character LCD with I2C backpack',
  width: 80,
  height: 40,
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
  dPin('pin2', '2', [25, 0], 'top'),
];

const LDR_DEF: ComponentDef = {
  type: 'photoresistor',
  name: 'Photoresistor (LDR)',
  category: 'sensor',
  description: 'Light-dependent resistor',
  width: 40,
  height: 42,
  pins: LDR_PINS,
  defaultX: 600,
  defaultY: 250,
};

// ─── DHT22 Sensor ─────────────────────────────────────────────────────────

const DHT22_PINS: Pin[] = [
  pwrPin('vcc', 'VCC', [15, 95], 'top'),
  dPin('dat', 'DATA', [26, 95], 'top'),
  dPin('nc', 'NC', [36, 95], 'top'),
  gndPin('gnd', 'GND', [46, 95], 'top'),
];

const DHT22_DEF: ComponentDef = {
  type: 'dht22',
  name: 'DHT22 Temp/Humidity',
  category: 'sensor',
  description: 'Temperature and humidity sensor',
  width: 60,
  height: 96,
  pins: DHT22_PINS,
  defaultX: 650,
  defaultY: 400,
};

// ─── Servo Motor ──────────────────────────────────────────────────────────

const SERVO_PINS: Pin[] = [
  gndPin('gnd', 'GND', [8.18, 51.89], 'left'),
  pwrPin('vcc', 'VCC', [8.18, 61.44], 'left'),
  dPin('sig', 'PWM', [8.18, 70.99], 'left'),
];

const SERVO_DEF: ComponentDef = {
  type: 'servo-motor',
  name: 'Servo Motor (SG90)',
  category: 'actuator',
  description: 'Standard servo motor',
  width: 180,
  height: 120,
  pins: SERVO_PINS,
  defaultX: 700,
  defaultY: 350,
};

// ─── Potentiometer ────────────────────────────────────────────────────────

const POT_PINS: Pin[] = [
  gndPin('gnd', 'GND', [30.72, 72], 'bottom'),
  dPin('sig', 'SIG', [40.88, 72], 'bottom'),
  pwrPin('vcc', 'VCC', [51.04, 72], 'bottom'),
];

const POT_DEF: ComponentDef = {
  type: 'potentiometer',
  name: 'Potentiometer (10kΩ)',
  category: 'passive',
  description: '10kΩ rotary potentiometer',
  width: 80,
  height: 80,
  pins: POT_PINS,
  defaultX: 550,
  defaultY: 450,
};

// ─── RGB LED ──────────────────────────────────────────────────────────────

const RGB_LED_PINS: Pin[] = [
  dPin('red', 'R', [10, 25], 'left'),
  gndPin('gnd', 'GND', [20, 34], 'bottom'),
  dPin('green', 'G', [30, 25], 'right'),
  dPin('blue', 'B', [40, 25], 'right'),
];

const RGB_LED_DEF: ComponentDef = {
  type: 'rgb-led',
  name: 'RGB LED',
  category: 'passive',
  description: 'Common cathode RGB LED',
  width: 45,
  height: 35,
  pins: RGB_LED_PINS,
  defaultX: 650,
  defaultY: 500,
};

// ─── Ultrasonic Sensor (HC-SR04) ┐═══════════════════════════════════════

const ULTRASONIC_PINS: Pin[] = [
  pwrPin('vcc', 'VCC', [76, 104], 'bottom'),
  dPin('trig', 'TRIG', [86, 104], 'bottom'),
  dPin('echo', 'ECHO', [96, 104], 'bottom'),
  gndPin('gnd', 'GND', [106, 104], 'bottom'),
];

const ULTRASONIC_DEF: ComponentDef = {
  type: 'ultrasonic-hc-sr04',
  name: 'HC-SR04 Ultrasonic',
  category: 'sensor',
  description: 'Ultrasonic distance sensor',
  width: 180,
  height: 110,
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
