// ─── Core Canvas Types ─────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface Pin {
  id: string;
  label: string;
  /** Local offset from component origin (top-left) */
  offset: Vec2;
  side: 'top' | 'bottom' | 'left' | 'right';
  type: 'digital' | 'analog' | 'power' | 'ground' | 'pwm' | 'i2c' | 'spi' | 'uart';
  value: number; // 0-5V or analog value
  mode: 'input' | 'output' | 'bidirectional';
}

export interface ComponentDef {
  type: string;
  name: string;
  category: 'board' | 'display' | 'sensor' | 'actuator' | 'passive' | 'communication' | 'power';
  description: string;
  width: number;
  height: number;
  pins: Pin[];
  defaultX: number;
  defaultY: number;
}

export interface PlacedComponent {
  id: string;
  defId: string;
  x: number;
  y: number;
  rotation: number;
  pins: Pin[];
  props?: Record<string, any>;
  /** For displays, etc - runtime state */
  state?: Record<string, any>;
}

export interface Wire {
  id: string;
  from: { componentId: string; pinId: string };
  to: { componentId: string; pinId: string };
  color: string;
  points?: Vec2[]; // manual routing points
}

export interface WireDraft {
  fromComponentId: string;
  fromPinId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// ─── Workspace State ────────────────────────────────────────────────────────

export type ActiveTab = 'design' | 'code' | 'simulate';

export interface WorkspaceState {
  panOffset: Vec2;
  zoom: number;
  gridSize: number;
  showGrid: boolean;
}

// ─── Simulation ────────────────────────────────────────────────────────────

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  elapsedTime: number;
  serialOutput: string[];
  errors: string[];
  pinStates: Record<string, Record<string, number>>; // componentId -> pinId -> value
}

// ─── Editor ────────────────────────────────────────────────────────────────

export interface EditorTab {
  id: string;
  name: string;
  language: 'arduino' | 'cpp' | 'h' | 'json';
  content: string;
  modified: boolean;
}

// ─── Board Definitions ─────────────────────────────────────────────────────

export interface BoardPinout {
  id: string;
  name: string;
  mcu: string;
  architecture: 'avr' | 'arm' | 'esp32' | 'riscv';
  pins: Pin[];
  width: number;
  height: number;
}
