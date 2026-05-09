export interface CircuitComponent {
  id: string;
  type: ComponentType;
  name: string;
  x: number;
  y: number;
  rotation: number;
  pins: PinState[];
  props?: Record<string, any>;
  groupId?: string;
}

export type ComponentType =
  | 'resistor' | 'led' | 'capacitor' | 'button' | 'motor' | 'servo'
  | 'lcd' | 'buzzer' | 'photoresistor' | 'potentiometer' | 'arduino_uno'
  | 'breadboard' | 'wire' | 'battery' | 'rgb_led' | 'seven_segment'
  | 'relay' | 'transistor' | 'diode' | 'esp32' | 'raspberry_pi_pico'
  | 'stm32' | 'attiny85' | 'custom_board' | 'sensor_dht22' | 'sensor_ultrasonic'
  | 'matrix_keypad' | 'stepper_motor' | 'shift_register' | 'i2c_oled';

export interface PinState {
  pinNumber: number;
  pinName: string;
  value: 'high' | 'low' | 'floating';
  voltage?: number;
  current?: number;
}

export interface SimulationState {
  isRunning: boolean;
  speed: number;
  elapsedTime: number;
  pinStates: Record<string, PinState[]>;
  serialOutput: string[];
  errors: string[];
}

export interface CircuitTemplate {
  id: string;
  name: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced';
  difficulty: 1 | 2 | 3 | 4 | 5;
  components: CircuitComponent[];
  code: string;
  circuitCode: string;
  thumbnail?: string;
  tags: string[];
  compatibleBoards: string[];
}

export interface BoardType {
  id: string;
  name: string;
  description: string;
  pins: number;
  voltage: number;
}

// ==================== REGISTRY TYPES ====================

export interface RegistryBoard {
  id: string;
  package: string;
  name: string;
  description: string;
  author: string;
  version: string;
  license: 'MIT' | 'BSD-3' | 'Apache-2.0' | 'GPL-3.0';
  category: 'microcontroller' | 'dev-board' | 'shield' | 'hat' | 'breakout' | 'sensor-module' | 'display-module' | 'custom';
  formFactor: 'arduino-shield' | 'rpi-hat' | 'custom' | 'breadboard-friendly' | ' Feather' | 'qwiic' | 'stm32-nucleo';
  dimensions: { width: string; height: string };
  pinCount: { digital: number; analog: number; pwm: number; i2c: number; spi: number; uart: number };
  voltage: number;
  mcu?: string;
  architecture?: 'avr' | 'arm-cortex-m0' | 'arm-cortex-m3' | 'arm-cortex-m4' | 'risc-v' | 'xtensa';
  installed: boolean;
  tags: string[];
  compatibleTemplates: string[];
  registryUrl?: string;
  tsciCommand: string;
  thumbnailColor: string;
}

export interface BoardTemplate {
  id: 'arduino-shield' | 'rpi-hat' | 'custom' | 'feather' | 'qwiic' | 'stm32-nucleo';
  name: string;
  description: string;
  baseWidth: string;
  baseHeight: string;
  defaultMountingHoles: boolean;
  defaultHeaders: boolean;
  defaultUsbConnector: boolean;
  defaultPowerIndicator: boolean;
}

export interface SubcircuitGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  componentIds: string[];
  isCollapsed: boolean;
}

export interface ImportSource {
  type: 'jlcpcb' | 'kicad' | 'tscircuit-registry' | 'snapeda' | 'custom';
  name: string;
  description: string;
  formats: string[];
  icon: string;
}

export interface EditorTab {
  id: string;
  name: string;
  language: 'c' | 'cpp' | 'python' | 'circuit' | 'kicad' | 'json';
  content: string;
  modified: boolean;
}

export type ViewMode = 'schematic' | 'pcb' | 'breadboard' | 'split';

export type PanelPosition = 'left' | 'right' | 'bottom';

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}
