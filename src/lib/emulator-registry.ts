'use client';

import type { PinState } from '@/types';

export type EmulatorType = 'avr8js' | 'rp2040js' | 'riscv' | 'espruino';

export interface SimulationBridge {
  start: () => void;
  stop: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  getState: () => Record<string, PinState[]>;
  onPinChange: (callback: (componentId: string, pinStates: PinState[]) => void) => void;
  onSerialOutput: (callback: (line: string) => void) => void;
  onError: (callback: (error: string) => void) => void;
  getSerialOutput: () => string[];
}

const emulatorInfo: Record<EmulatorType, {
  name: string;
  license: string;
  description: string;
  supports: string[];
  languages: string[];
  architectures: string[];
}> = {
  avr8js: {
    name: 'AVR8js',
    license: 'MIT',
    description: 'High-performance 8-bit AVR emulator for Arduino Uno/Nano/Mega',
    supports: ['Arduino Uno', 'Arduino Nano', 'Arduino Mega', 'ATtiny85'],
    languages: ['C/C++', 'Arduino'],
    architectures: ['AVR (ATmega328P)', 'AVR (ATmega2560)', 'AVR (ATtiny85)'],
  },
  rp2040js: {
    name: 'RP2040js',
    license: 'MIT',
    description: 'RP2040 dual-core ARM Cortex-M0+ emulator for Raspberry Pi Pico',
    supports: ['Raspberry Pi Pico', 'Raspberry Pi Pico W'],
    languages: ['MicroPython', 'CircuitPython', 'C/C++'],
    architectures: ['ARM Cortex-M0+ (RP2040)'],
  },
  riscv: {
    name: 'RISC-V (rvemu)',
    license: 'MIT',
    description: 'RISC-V (RV32IMAC) emulator via WASM for ESP32-C3 and RISC-V boards',
    supports: ['ESP32-C3', 'RISC-V Feather'],
    languages: ['C/C++', 'Espruino JavaScript', 'Arduino'],
    architectures: ['RISC-V (RV32IMAC)', 'ESP32-C3 (Xtensa/RISC-V)'],
  },
  espruino: {
    name: 'Espruino',
    license: 'MIT/MPL',
    description: 'JavaScript interpreter with Emscripten build for IoT peripheral simulation',
    supports: ['ESP32', 'ESP8266', 'STM32'],
    languages: ['JavaScript', 'Espruino'],
    architectures: ['Xtensa (ESP32)', 'ARM (STM32)'],
  },
};

export function getEmulatorInfo(type: EmulatorType) {
  return emulatorInfo[type];
}

export function getEmulatorForBoard(boardId: string): EmulatorType {
  if (boardId.includes('arduino') || boardId.includes('attiny') || boardId.includes('avr')) {
    return 'avr8js';
  }
  if (boardId.includes('pico') || boardId.includes('rp2040')) {
    return 'rp2040js';
  }
  if (boardId.includes('esp32-c3') || boardId.includes('risc-v') || boardId.includes('feather')) {
    return 'riscv';
  }
  if (boardId.includes('esp32') || boardId.includes('esp8266')) {
    return 'espruino';
  }
  return 'avr8js';
}

export function getSupportedLanguage(boardId: string): string {
  const emulator = getEmulatorForBoard(boardId);
  const info = emulatorInfo[emulator];
  return info.languages[0];
}

// Board architecture mapping
export const boardArchMap: Record<string, EmulatorType> = {
  'arduino-uno': 'avr8js',
  'arduino-nano': 'avr8js',
  'arduino-mega': 'avr8js',
  'attiny85': 'avr8js',
  'raspberry-pi-pico': 'rp2040js',
  'raspberry-pi-pico-w': 'rp2040js',
  'esp32-devkit': 'espruino',
  'esp8266-nodemcu': 'espruino',
  'esp32-c3': 'riscv',
  'risc-v-feather': 'riscv',
  'stm32-nucleo-f411re': 'rp2040js',
  'stm32-nucleo-f103rb': 'rp2040js',
};
