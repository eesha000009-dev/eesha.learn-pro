export interface CircuitComponent {
  id: string;
  type: 'resistor' | 'led' | 'capacitor' | 'button' | 'motor' | 'servo' | 'lcd' | 'buzzer' | 'photoresistor' | 'potentiometer' | 'arduino_uno' | 'breadboard' | 'wire' | 'battery' | 'rgb_led' | 'seven_segment' | 'relay' | 'transistor' | 'diode';
  name: string;
  x: number;
  y: number;
  rotation: number;
  pins: PinState[];
  props?: Record<string, any>;
}

export interface PinState {
  pinNumber: number;
  pinName: string;
  value: 'high' | 'low' | 'floating';
  voltage?: number;
  current?: number;
}

export interface SimulationState {
  isRunning: boolean;
  speed: number; // 1x, 2x, 4x, 8x
  elapsedTime: number; // in ms
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
}

export interface BoardType {
  id: 'arduino_uno' | 'esp32' | 'raspberry_pi_pico' | 'breadboard';
  name: string;
  description: string;
  pins: number;
  voltage: number;
}

export interface EditorTab {
  id: string;
  name: string;
  language: 'c' | 'cpp' | 'python' | 'circuit';
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
