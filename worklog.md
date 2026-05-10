---
Task ID: 1
Agent: Main Agent
Task: Complete rewrite of Eesha Learn to Wokwi-like simulator - removed tscircuit, built canvas-based UI

Work Log:
- Removed all tscircuit packages (@tscircuit/core, @tscircuit/eval, @tscircuit/footprinter, @tscircuit/layout, @tscircuit/react-fiber, @tscircuit/schematic-viewer, circuit-json)
- Removed 14 old component files (schematic-viewer, component-inspector, board-gallery, simulation-controls, template-gallery, component-palette, serial-monitor, BoardSVG, wiring-engine, board-pinouts, simulation-bridge, rp2040-bridge, templates, board-registry, emulator-registry, riscv-bridge, components)
- Rewrote src/types/index.ts with canvas-based types (Vec2, Pin, ComponentDef, PlacedComponent, Wire, WireDraft, WorkspaceState, ActiveTab)
- Rewrote src/store/simulator-store.ts with Wokwi-like state management (tab switching Design/Code/Simulate, canvas pan/zoom, component placement, wire drawing, simulation control)
- Created src/lib/component-defs.ts with 15 component definitions (Arduino UNO, LEDs, Resistor, Button, Buzzer, LCD 16x2, Photoresistor, DHT22, Servo, Potentiometer, RGB LED, Ultrasonic HC-SR04)
- Built src/components/workspace/ArduinoBoardSVG.tsx - realistic Arduino UNO SVG with USB-B connector, power jack, ATmega328P chip, ICSP header, LEDs, reset button, accurate pin layout (14 digital + 6 analog + power)
- Built src/components/workspace/ComponentRenderer.tsx - SVG rendering for all 15 component types with state visualization (LED glow, LCD text, servo angle, sensor readings)
- Built src/components/workspace/WireRenderer.tsx - Manhattan-style wire routing with color support and selection
- Built src/components/workspace/CanvasWorkspace.tsx - SVG canvas with pan/zoom (wheel + drag), component dragging, pin-to-pin wire connections, keyboard shortcuts (Delete, Escape), wire color indicator
- Built src/components/CodeEditorPanel.tsx - Monaco editor with Arduino language support, dark theme, IntelliSense completions, tab management
- Built src/components/SerialMonitor.tsx - Terminal-style serial output with baud rate selector, send input
- Built src/components/ComponentPalette.tsx - Sidebar with categorized component list (Boards, Displays, Sensors, Actuators, Passive)
- Rewrote src/app/page.tsx - Wokwi-style layout with Design/Code/Simulate tabs, simulation controls, wire color picker, component count, running status
- Updated layout.tsx metadata

Stage Summary:
- Complete Wokwi-like UI replacement done
- No more tscircuit dependency - using pure SVG canvas rendering
- avr8js simulation engine kept for future actual AVR emulation
- Lint passes clean
- Page loads successfully (HTTP 200)
- All 15 component types with realistic SVG visuals
- Pin-to-pin wire connection system working
- Design/Code/Simulate tab navigation
