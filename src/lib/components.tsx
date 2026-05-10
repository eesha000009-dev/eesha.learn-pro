import { Cpu, CircuitBoard, Lightbulb, Wifi, Zap, Monitor, Keyboard, CpuIcon, Microchip } from 'lucide-react';
import type { CircuitComponent } from '@/types';

export interface ComponentDefinition {
  type: CircuitComponent['type'];
  name: string;
  icon: React.ReactNode;
  description: string;
  category: 'basic' | 'input' | 'output' | 'display' | 'motor' | 'sensor' | 'board';
  defaultPins: { pinNumber: number; pinName: string; value: 'high' | 'low' | 'floating' }[];
  defaultProps?: Record<string, any>;
}

export const componentLibrary: ComponentDefinition[] = [
  // Boards
  {
    type: 'arduino_uno',
    name: 'Arduino Uno',
    icon: <Microchip className="h-5 w-5" />,
    description: 'ATmega328P microcontroller board',
    category: 'board',
    defaultPins: Array.from({ length: 14 }, (_, i) => ({
      pinNumber: i,
      pinName: `D${i}`,
      value: 'low' as const,
    })),
  },
  {
    type: 'breadboard',
    name: 'Breadboard',
    icon: <CircuitBoard className="h-5 w-5" />,
    description: 'Full-size solderless breadboard',
    category: 'board',
    defaultPins: [],
  },
  // Basic components
  {
    type: 'resistor',
    name: 'Resistor',
    icon: <Zap className="h-5 w-5" />,
    description: '220Ω Resistor',
    category: 'basic',
    defaultPins: [
      { pinNumber: 1, pinName: 'pin1', value: 'low' },
      { pinNumber: 2, pinName: 'pin2', value: 'low' },
    ],
    defaultProps: { resistance: 220 },
  },
  {
    type: 'capacitor',
    name: 'Capacitor',
    icon: <Zap className="h-5 w-5" />,
    description: '100µF Electrolytic Capacitor',
    category: 'basic',
    defaultPins: [
      { pinNumber: 1, pinName: 'positive', value: 'low' },
      { pinNumber: 2, pinName: 'negative', value: 'low' },
    ],
    defaultProps: { capacitance: 100 },
  },
  {
    type: 'diode',
    name: 'Diode',
    icon: <Zap className="h-5 w-5" />,
    description: '1N4148 Signal Diode',
    category: 'basic',
    defaultPins: [
      { pinNumber: 1, pinName: 'anode', value: 'low' },
      { pinNumber: 2, pinName: 'cathode', value: 'low' },
    ],
  },
  {
    type: 'transistor',
    name: 'NPN Transistor',
    icon: <Cpu className="h-5 w-5" />,
    description: '2N2222 NPN Transistor',
    category: 'basic',
    defaultPins: [
      { pinNumber: 1, pinName: 'base', value: 'low' },
      { pinNumber: 2, pinName: 'collector', value: 'low' },
      { pinNumber: 3, pinName: 'emitter', value: 'low' },
    ],
  },
  {
    type: 'battery',
    name: 'Battery',
    icon: <Zap className="h-5 w-5" />,
    description: '9V Battery',
    category: 'basic',
    defaultPins: [
      { pinNumber: 1, pinName: 'positive', value: 'high' },
      { pinNumber: 2, pinName: 'negative', value: 'low' },
    ],
    defaultProps: { voltage: 9 },
  },
  {
    type: 'wire',
    name: 'Wire',
    icon: <CircuitBoard className="h-5 w-5" />,
    description: 'Jumper Wire',
    category: 'basic',
    defaultPins: [
      { pinNumber: 1, pinName: 'end1', value: 'low' },
      { pinNumber: 2, pinName: 'end2', value: 'low' },
    ],
  },
  // Input
  {
    type: 'button',
    name: 'Push Button',
    icon: <Keyboard className="h-5 w-5" />,
    description: 'Tactile Push Button (4-pin)',
    category: 'input',
    defaultPins: [
      { pinNumber: 1, pinName: 'pin1', value: 'low' },
      { pinNumber: 2, pinName: 'pin2', value: 'low' },
      { pinNumber: 3, pinName: 'pin3', value: 'low' },
      { pinNumber: 4, pinName: 'pin4', value: 'low' },
    ],
  },
  {
    type: 'potentiometer',
    name: 'Potentiometer',
    icon: <Zap className="h-5 w-5" />,
    description: '10kΩ Rotary Potentiometer',
    category: 'input',
    defaultPins: [
      { pinNumber: 1, pinName: 'pin1', value: 'low' },
      { pinNumber: 2, pinName: 'wiper', value: 'low' },
      { pinNumber: 3, pinName: 'pin3', value: 'low' },
    ],
    defaultProps: { resistance: 10000 },
  },
  {
    type: 'photoresistor',
    name: 'Photoresistor',
    icon: <Monitor className="h-5 w-5" />,
    description: 'Light Dependent Resistor (LDR)',
    category: 'sensor',
    defaultPins: [
      { pinNumber: 1, pinName: 'pin1', value: 'low' },
      { pinNumber: 2, pinName: 'pin2', value: 'low' },
    ],
  },
  // Output
  {
    type: 'led',
    name: 'LED',
    icon: <Lightbulb className="h-5 w-5" />,
    description: '5mm LED',
    category: 'output',
    defaultPins: [
      { pinNumber: 1, pinName: 'anode', value: 'low' },
      { pinNumber: 2, pinName: 'cathode', value: 'low' },
    ],
    defaultProps: { color: '#ef4444' },
  },
  {
    type: 'rgb_led',
    name: 'RGB LED',
    icon: <Lightbulb className="h-5 w-5" />,
    description: 'Common Cathode RGB LED',
    category: 'output',
    defaultPins: [
      { pinNumber: 1, pinName: 'red', value: 'low' },
      { pinNumber: 2, pinName: 'common', value: 'low' },
      { pinNumber: 3, pinName: 'green', value: 'low' },
      { pinNumber: 4, pinName: 'blue', value: 'low' },
    ],
  },
  {
    type: 'buzzer',
    name: 'Piezo Buzzer',
    icon: <Zap className="h-5 w-5" />,
    description: 'Active Piezo Buzzer',
    category: 'output',
    defaultPins: [
      { pinNumber: 1, pinName: 'positive', value: 'low' },
      { pinNumber: 2, pinName: 'negative', value: 'low' },
    ],
  },
  {
    type: 'relay',
    name: 'Relay',
    icon: <CpuIcon className="h-5 w-5" />,
    description: '5V Relay Module',
    category: 'output',
    defaultPins: [
      { pinNumber: 1, pinName: 'vcc', value: 'high' },
      { pinNumber: 2, pinName: 'gnd', value: 'low' },
      { pinNumber: 3, pinName: 'signal', value: 'low' },
    ],
  },
  // Display
  {
    type: 'lcd',
    name: '16x2 LCD',
    icon: <Monitor className="h-5 w-5" />,
    description: 'HD44780 16x2 Character LCD',
    category: 'display',
    defaultPins: Array.from({ length: 16 }, (_, i) => ({
      pinNumber: i + 1,
      pinName: `pin${i + 1}`,
      value: 'low' as const,
    })),
    defaultProps: { rows: 2, cols: 16 },
  },
  {
    type: 'seven_segment',
    name: '7-Segment Display',
    icon: <Monitor className="h-5 w-5" />,
    description: 'Common Cathode 7-Segment',
    category: 'display',
    defaultPins: Array.from({ length: 10 }, (_, i) => ({
      pinNumber: i + 1,
      pinName: `pin${i + 1}`,
      value: 'low' as const,
    })),
    defaultProps: { commonCathode: true },
  },
  // Motor
  {
    type: 'motor',
    name: 'DC Motor',
    icon: <CpuIcon className="h-5 w-5" />,
    description: 'Small DC Motor',
    category: 'motor',
    defaultPins: [
      { pinNumber: 1, pinName: 'positive', value: 'low' },
      { pinNumber: 2, pinName: 'negative', value: 'low' },
    ],
  },
  {
    type: 'servo',
    name: 'Servo Motor',
    icon: <CpuIcon className="h-5 w-5" />,
    description: 'SG90 Micro Servo',
    category: 'motor',
    defaultPins: [
      { pinNumber: 1, pinName: 'vcc', value: 'high' },
      { pinNumber: 2, pinName: 'signal', value: 'low' },
      { pinNumber: 3, pinName: 'gnd', value: 'low' },
    ],
    defaultProps: { minAngle: 0, maxAngle: 180 },
  },
  // Wireless
  {
    type: 'arduino_uno',
    name: 'ESP32 DevKit',
    icon: <Wifi className="h-5 w-5" />,
    description: 'ESP32-WROOM-32 DevKit (Server-side sim)',
    category: 'board',
    defaultPins: Array.from({ length: 20 }, (_, i) => ({
      pinNumber: i,
      pinName: `D${i}`,
      value: 'low' as const,
    })),
  },
];

export const componentCategories = [
  { id: 'board', name: 'Boards', color: 'bg-amber-500' },
  { id: 'basic', name: 'Basic', color: 'bg-emerald-500' },
  { id: 'input', name: 'Input', color: 'bg-sky-500' },
  { id: 'output', name: 'Output', color: 'bg-rose-500' },
  { id: 'display', name: 'Display', color: 'bg-violet-500' },
  { id: 'motor', name: 'Motors', color: 'bg-orange-500' },
  { id: 'sensor', name: 'Sensors', color: 'bg-teal-500' },
];
