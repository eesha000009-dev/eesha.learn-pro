import { create } from 'zustand';
import type {
  SimulationState,
  ViewMode,
  CircuitComponent,
  PinState,
  LogEntry,
  EditorTab,
  SubcircuitGroup,
} from '@/types';

interface SimulatorStore {
  // Simulation
  simulation: SimulationState;
  setRunning: (running: boolean) => void;
  setSpeed: (speed: number) => void;
  addSerialOutput: (line: string) => void;
  clearSerialOutput: () => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  updatePinState: (componentId: string, pinStates: PinState[]) => void;
  resetSimulation: () => void;

  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;

  // Components on the canvas
  components: CircuitComponent[];
  addComponent: (component: CircuitComponent) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  clearComponents: () => void;

  // Selected component
  selectedComponentId: string | null;
  setSelectedComponent: (id: string | null) => void;

  // Code Editor
  editorTabs: EditorTab[];
  activeTabId: string | null;
  addTab: (tab: EditorTab) => void;
  updateTabContent: (id: string, content: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Board (now supports any registry board ID)
  boardType: string;
  setBoardType: (board: string) => void;

  // Registry Boards
  installedBoardIds: Set<string>;
  installBoard: (id: string) => void;
  uninstallBoard: (id: string) => void;

  // Subcircuit Groups
  subcircuitGroups: SubcircuitGroup[];
  addGroup: (group: SubcircuitGroup) => void;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  toggleGroupCollapse: (id: string) => void;
  addComponentToGroup: (groupId: string, componentId: string) => void;
  removeComponentFromGroup: (groupId: string, componentId: string) => void;

  // Logs
  logs: LogEntry[];
  addLog: (entry: LogEntry) => void;
  clearLogs: () => void;

  // Console panel
  showConsole: boolean;
  toggleConsole: () => void;
  showComponentPanel: boolean;
  toggleComponentPanel: () => void;
}

const defaultSimulation: SimulationState = {
  isRunning: false,
  speed: 1,
  elapsedTime: 0,
  pinStates: {},
  serialOutput: [],
  errors: [],
};

export const useSimulatorStore = create<SimulatorStore>((set) => ({
  simulation: { ...defaultSimulation },
  setRunning: (running) =>
    set((s) => ({ simulation: { ...s.simulation, isRunning: running } })),
  setSpeed: (speed) =>
    set((s) => ({ simulation: { ...s.simulation, speed } })),
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
      simulation: {
        ...s.simulation,
        errors: [...s.simulation.errors, error],
      },
    })),
  clearErrors: () =>
    set((s) => ({ simulation: { ...s.simulation, errors: [] } })),
  updatePinState: (componentId, pinStates) =>
    set((s) => ({
      simulation: {
        ...s.simulation,
        pinStates: { ...s.simulation.pinStates, [componentId]: pinStates },
      },
    })),
  resetSimulation: () => set({ simulation: { ...defaultSimulation } }),

  viewMode: 'breadboard',
  setViewMode: (mode) => set({ viewMode: mode }),
  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),

  components: [],
  addComponent: (component) =>
    set((s) => ({ components: [...s.components, component] })),
  removeComponent: (id) =>
    set((s) => ({ components: s.components.filter((c) => c.id !== id) })),
  updateComponent: (id, updates) =>
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  clearComponents: () => set({ components: [] }),

  selectedComponentId: null,
  setSelectedComponent: (id) => set({ selectedComponentId: id }),

  editorTabs: [],
  activeTabId: null,
  addTab: (tab) =>
    set((s) => {
      if (s.editorTabs.find((t) => t.id === tab.id)) return s;
      return {
        editorTabs: [...s.editorTabs, tab],
        activeTabId: tab.id,
      };
    }),
  updateTabContent: (id, content) =>
    set((s) => ({
      editorTabs: s.editorTabs.map((t) =>
        t.id === id ? { ...t, content, modified: true } : t
      ),
    })),
  closeTab: (id) =>
    set((s) => {
      const idx = s.editorTabs.findIndex((t) => t.id === id);
      const newTabs = s.editorTabs.filter((t) => t.id !== id);
      const newActive =
        s.activeTabId === id
          ? newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null
          : s.activeTabId;
      return { editorTabs: newTabs, activeTabId: newActive };
    }),
  setActiveTab: (id) => set({ activeTabId: id }),

  boardType: 'arduino-uno',
  setBoardType: (board) => set({ boardType: board }),

  installedBoardIds: new Set(['arduino-uno', 'arduino-nano']),
  installBoard: (id) =>
    set((s) => {
      const next = new Set(s.installedBoardIds);
      next.add(id);
      return { installedBoardIds: next };
    }),
  uninstallBoard: (id) =>
    set((s) => {
      const next = new Set(s.installedBoardIds);
      next.delete(id);
      return { installedBoardIds: next };
    }),

  subcircuitGroups: [],
  addGroup: (group) =>
    set((s) => ({ subcircuitGroups: [...s.subcircuitGroups, group] })),
  removeGroup: (id) =>
    set((s) => ({ subcircuitGroups: s.subcircuitGroups.filter((g) => g.id !== id) })),
  renameGroup: (id, name) =>
    set((s) => ({
      subcircuitGroups: s.subcircuitGroups.map((g) =>
        g.id === id ? { ...g, name } : g
      ),
    })),
  toggleGroupCollapse: (id) =>
    set((s) => ({
      subcircuitGroups: s.subcircuitGroups.map((g) =>
        g.id === id ? { ...g, isCollapsed: !g.isCollapsed } : g
      ),
    })),
  addComponentToGroup: (groupId, componentId) =>
    set((s) => ({
      subcircuitGroups: s.subcircuitGroups.map((g) =>
        g.id === groupId
          ? { ...g, componentIds: [...g.componentIds, componentId] }
          : g
      ),
    })),
  removeComponentFromGroup: (groupId, componentId) =>
    set((s) => ({
      subcircuitGroups: s.subcircuitGroups.map((g) =>
        g.id === groupId
          ? { ...g, componentIds: g.componentIds.filter((cId) => cId !== componentId) }
          : g
      ),
    })),

  logs: [],
  addLog: (entry) =>
    set((s) => ({ logs: [...s.logs.slice(-200), entry] })),
  clearLogs: () => set({ logs: [] }),

  showConsole: true,
  toggleConsole: () => set((s) => ({ showConsole: !s.showConsole })),
  showComponentPanel: true,
  toggleComponentPanel: () =>
    set((s) => ({ showComponentPanel: !s.showComponentPanel })),
}));
