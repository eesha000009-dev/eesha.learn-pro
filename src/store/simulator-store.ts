import { create } from 'zustand';
import type {
  SimulationState,
  ActiveTab,
  WorkspaceState,
  PlacedComponent,
  Wire,
  WireDraft,
  EditorTab,
  Vec2,
  ComponentDef,
} from '@/types';
import { BOARD_DEFINITIONS, COMPONENT_DEFINITIONS } from '@/lib/component-defs';
import type { Pin } from '@/types';

interface SimulatorStore {
  // ─── Active Tab ──────────────────────────────────────────────────────────
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // ─── Workspace ───────────────────────────────────────────────────────────
  workspace: WorkspaceState;
  setPanOffset: (offset: Vec2) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;

  // ─── Components on Canvas ────────────────────────────────────────────────
  components: PlacedComponent[];
  addComponent: (defId: string, x?: number, y?: number) => string;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  rotateComponent: (id: string) => void;
  updateComponentState: (id: string, state: Record<string, any>) => void;
  setComponentPinValue: (componentId: string, pinId: string, value: number) => void;
  clearComponents: () => void;

  // ─── Selection ───────────────────────────────────────────────────────────
  selectedComponentId: string | null;
  setSelectedComponent: (id: string | null) => void;
  selectedWireId: string | null;
  setSelectedWire: (id: string | null) => void;

  // ─── Wiring ──────────────────────────────────────────────────────────────
  wires: Wire[];
  wireDraft: WireDraft | null;
  wireColor: string;
  addWire: (from: { componentId: string; pinId: string }, to: { componentId: string; pinId: string }) => void;
  removeWire: (id: string) => void;
  startWireDraft: (componentId: string, pinId: string, startX: number, startY: number) => void;
  updateWireDraft: (x: number, y: number) => void;
  cancelWireDraft: () => void;
  finishWireDraft: (componentId: string, pinId: string) => void;
  setWireColor: (color: string) => void;

  // ─── Simulation ──────────────────────────────────────────────────────────
  simulation: SimulationState;
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  tickElapsedTime: () => void;
  addSerialOutput: (line: string) => void;
  clearSerialOutput: () => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  resetSimulation: () => void;

  // ─── Code Editor ─────────────────────────────────────────────────────────
  editorTabs: EditorTab[];
  activeEditorTabId: string | null;
  addEditorTab: (tab: EditorTab) => void;
  updateEditorTabContent: (id: string, content: string) => void;
  closeEditorTab: (id: string) => void;
  setActiveEditorTab: (id: string) => void;

  // ─── Component Palette ───────────────────────────────────────────────────
  showPalette: boolean;
  togglePalette: () => void;

  // ─── Serial Monitor ──────────────────────────────────────────────────────
  showSerialMonitor: boolean;
  toggleSerialMonitor: () => void;
}

const defaultSimulation: SimulationState = {
  isRunning: false,
  isPaused: false,
  speed: 1,
  elapsedTime: 0,
  serialOutput: [],
  errors: [],
  pinStates: {},
};

const DEFAULT_SKETCH_CODE = `// Eesha Learn - Arduino Sketch
// LED Blink on Pin 13

void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("Eesha Learn - LED Blink");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(1000);
}
`;

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  activeTab: 'design',
  setActiveTab: (tab) => set({ activeTab: tab }),

  workspace: {
    panOffset: { x: 0, y: 0 },
    zoom: 1,
    gridSize: 20,
    showGrid: true,
  },
  setPanOffset: (offset) =>
    set((s) => ({ workspace: { ...s.workspace, panOffset: offset } })),
  setZoom: (zoom) =>
    set((s) => ({ workspace: { ...s.workspace, zoom: Math.max(0.25, Math.min(3, zoom)) } })),
  toggleGrid: () =>
    set((s) => ({ workspace: { ...s.workspace, showGrid: !s.workspace.showGrid } })),

  components: [],
  addComponent: (defId, x, y) => {
    const def = COMPONENT_DEFINITIONS.find((d) => d.type === defId);
    if (!def) return '';
    const id = `${defId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const comp: PlacedComponent = {
      id,
      defId: def.type,
      x: x ?? def.defaultX,
      y: y ?? def.defaultY,
      rotation: 0,
      pins: def.pins.map((p) => ({ ...p })),
      state: def.type === 'arduino-uno' ? { ledOn: false, powerLed: true } : {},
    };
    set((s) => ({ components: [...s.components, comp] }));
    return id;
  },
  removeComponent: (id) =>
    set((s) => ({
      components: s.components.filter((c) => c.id !== id),
      wires: s.wires.filter((w) => w.from.componentId !== id && w.to.componentId !== id),
    })),
  moveComponent: (id, x, y) =>
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, x, y } : c)),
    })),
  rotateComponent: (id) =>
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, rotation: (c.rotation + 90) % 360 } : c
      ),
    })),
  updateComponentState: (id, state) =>
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, state: { ...c.state, ...state } } : c
      ),
    })),
  setComponentPinValue: (componentId, pinId, value) =>
    set((s) => ({
      components: s.components.map((c) => {
        if (c.id !== componentId) return c;
        return {
          ...c,
          pins: c.pins.map((p) => (p.id === pinId ? { ...p, value } : p)),
        };
      }),
      simulation: {
        ...s.simulation,
        pinStates: {
          ...s.simulation.pinStates,
          [componentId]: {
            ...(s.simulation.pinStates[componentId] || {}),
            [pinId]: value,
          },
        },
      },
    })),
  clearComponents: () => set({ components: [], wires: [] }),

  selectedComponentId: null,
  setSelectedComponent: (id) => set({ selectedComponentId: id }),
  selectedWireId: null,
  setSelectedWire: (id) => set({ selectedWireId: id }),

  wires: [],
  wireDraft: null,
  wireColor: '#ef4444',
  addWire: (from, to) => {
    const { wireColor, wires } = get();
    const id = `wire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set({ wires: [...wires, { id, from, to, color: wireColor }] });
  },
  removeWire: (id) =>
    set((s) => ({
      wires: s.wires.filter((w) => w.id !== id),
      selectedWireId: s.selectedWireId === id ? null : s.selectedWireId,
    })),
  startWireDraft: (componentId, pinId, startX, startY) =>
    set({
      wireDraft: { fromComponentId: componentId, fromPinId: pinId, startX, startY, currentX: startX, currentY: startY },
    }),
  updateWireDraft: (x, y) =>
    set((s) =>
      s.wireDraft ? { wireDraft: { ...s.wireDraft, currentX: x, currentY: y } } : {}
    ),
  cancelWireDraft: () => set({ wireDraft: null }),
  finishWireDraft: (componentId, pinId) => {
    const { wireDraft, addWire } = get();
    if (wireDraft) {
      addWire(
        { componentId: wireDraft.fromComponentId, pinId: wireDraft.fromPinId },
        { componentId, pinId }
      );
      set({ wireDraft: null });
    }
  },
  setWireColor: (color) => set({ wireColor: color }),

  simulation: { ...defaultSimulation },
  setRunning: (running) =>
    set((s) => ({ simulation: { ...s.simulation, isRunning: running } })),
  setPaused: (paused) =>
    set((s) => ({ simulation: { ...s.simulation, isPaused: paused } })),
  setSpeed: (speed) =>
    set((s) => ({ simulation: { ...s.simulation, speed } })),
  tickElapsedTime: () =>
    set((s) => ({
      simulation: { ...s.simulation, elapsedTime: s.simulation.elapsedTime + 0.05 },
    })),
  addSerialOutput: (line) =>
    set((s) => ({
      simulation: {
        ...s.simulation,
        serialOutput: [...s.simulation.serialOutput, line],
      },
    })),
  clearSerialOutput: () =>
    set((s) => ({ simulation: { ...s.simulation, serialOutput: [] } })),
  addError: (error) =>
    set((s) => ({
      simulation: { ...s.simulation, errors: [...s.simulation.errors, error] },
    })),
  clearErrors: () =>
    set((s) => ({ simulation: { ...s.simulation, errors: [] } })),
  resetSimulation: () => {
    set({
      simulation: { ...defaultSimulation },
      components: get().components.map((c) => ({
        ...c,
        pins: c.pins.map((p) => ({ ...p, value: 0 })),
        state: c.defId === 'arduino-uno' ? { ledOn: false, powerLed: true } : c.state,
      })),
    });
  },

  editorTabs: [],
  activeEditorTabId: null,
  addEditorTab: (tab) =>
    set((s) => {
      if (s.editorTabs.find((t) => t.id === tab.id)) return s;
      return { editorTabs: [...s.editorTabs, tab], activeEditorTabId: tab.id };
    }),
  updateEditorTabContent: (id, content) =>
    set((s) => ({
      editorTabs: s.editorTabs.map((t) =>
        t.id === id ? { ...t, content, modified: true } : t
      ),
    })),
  closeEditorTab: (id) =>
    set((s) => {
      const idx = s.editorTabs.findIndex((t) => t.id === id);
      const newTabs = s.editorTabs.filter((t) => t.id !== id);
      const newActive =
        s.activeEditorTabId === id
          ? newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null
          : s.activeEditorTabId;
      return { editorTabs: newTabs, activeEditorTabId: newActive };
    }),
  setActiveEditorTab: (id) => set({ activeEditorTabId: id }),

  showPalette: true,
  togglePalette: () => set((s) => ({ showPalette: !s.showPalette })),
  showSerialMonitor: true,
  toggleSerialMonitor: () => set((s) => ({ showSerialMonitor: !s.showSerialMonitor })),
}));
