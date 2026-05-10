import type { PinState } from '@/types';

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

export class AvrSimulation implements SimulationBridge {
  private running = false;
  private speed = 1;
  private pinStates: Record<string, PinState[]> = {};
  private pinChangeCallbacks: ((componentId: string, pinStates: PinState[]) => void)[] = [];
  private serialCallbacks: ((line: string) => void)[] = [];
  private errorCallbacks: ((error: string) => void)[] = [];
  private serialBuffer: string[] = [];
  private timerId: ReturnType<typeof setInterval> | null = null;
  private stepCounter = 0;
  private compiledCode: string | null = null;

  constructor() {
    this.pinStates = {
      arduino_uno: Array.from({ length: 14 }, (_, i) => ({
        pinNumber: i,
        pinName: "D" + i,
        value: "low" as const,
        voltage: i === 0 ? 5 : 0,
      })),
    };
  }

  async loadCode(code: string): Promise<void> {
    this.compiledCode = code;
    this.pinStates = {
      arduino_uno: Array.from({ length: 14 }, (_, i) => ({
        pinNumber: i,
        pinName: "D" + i,
        value: "low" as const,
        voltage: i === 0 ? 5 : 0,
      })),
    };
  }

  start(): void {
    if (this.running) return;
    if (!this.compiledCode) {
      this.errorCallbacks.forEach((cb) => cb("No code loaded. Please compile first."));
      return;
    }

    this.running = true;
    this.stepCounter = 0;
    this.serialBuffer = [];
    this.simulateLoop();
  }

  stop(): void {
    this.running = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  reset(): void {
    this.stop();
    this.stepCounter = 0;
    this.serialBuffer = [];
    this.pinStates = {
      arduino_uno: Array.from({ length: 14 }, (_, i) => ({
        pinNumber: i,
        pinName: "D" + i,
        value: "low" as const,
        voltage: i === 0 ? 5 : 0,
      })),
    };
    this.pinChangeCallbacks.forEach((cb) => cb("arduino_uno", this.pinStates["arduino_uno"]));
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.running) {
      this.stop();
      this.running = true;
      this.simulateLoop();
    }
  }

  getState(): Record<string, PinState[]> {
    return { ...this.pinStates };
  }

  onPinChange(callback: (componentId: string, pinStates: PinState[]) => void): void {
    this.pinChangeCallbacks.push(callback);
  }

  onSerialOutput(callback: (line: string) => void): void {
    this.serialCallbacks.push(callback);
  }

  onError(callback: (error: string) => void): void {
    this.errorCallbacks.push(callback);
  }

  getSerialOutput(): string[] {
    return [...this.serialBuffer];
  }

  private simulateLoop(): void {
    if (!this.running || !this.compiledCode) return;

    const code = this.compiledCode;
    const interval = Math.max(16, 200 / this.speed);

    this.timerId = setInterval(() => {
      if (!this.running) {
        if (this.timerId) clearInterval(this.timerId);
        return;
      }

      this.stepCounter++;

      if (code.includes("pinMode(13, OUTPUT)") || code.includes("pinMode(12, OUTPUT)") || code.includes("pinMode(10, OUTPUT)")) {
        this.simulateBlink(code);
      }

      if (code.includes("Serial.begin") && this.stepCounter % Math.floor(30 / this.speed) === 0) {
        this.simulateSerial(code);
      }

      if (this.pinStates["arduino_uno"]) {
        this.pinChangeCallbacks.forEach((cb) => cb("arduino_uno", this.pinStates["arduino_uno"]));
      }
    }, interval);
  }

  private simulateBlink(code: string): void {
    const pins = this.pinStates["arduino_uno"];
    if (!pins) return;

    const period = 60 / this.speed;
    const isHigh = Math.floor(this.stepCounter / period) % 2 === 0;

    if (code.includes("digitalWrite(13")) {
      pins[13] = {
        ...pins[13],
        value: isHigh ? "high" : "low",
        voltage: isHigh ? 5 : 0,
      };
    }

    if (code.includes("digitalWrite(12") && code.includes("digitalWrite(11") && code.includes("digitalWrite(10")) {
      const phase = Math.floor(this.stepCounter / (60 / this.speed)) % 4;
      pins[12] = { ...pins[12], value: phase === 0 ? "high" : "low", voltage: phase === 0 ? 5 : 0 };
      pins[11] = { ...pins[11], value: phase === 1 || phase === 3 ? "high" : "low", voltage: phase === 1 || phase === 3 ? 5 : 0 };
      pins[10] = { ...pins[10], value: phase === 2 ? "high" : "low", voltage: phase === 2 ? 5 : 0 };
    }
  }

  private simulateSerial(code: string): void {
    const isButtonLed = code.includes("Serial.println") && code.includes("LED ON");
    const isLight = code.includes("Serial.print") && code.includes("Light:");
    const isMelody = code.includes("Serial.println") && code.includes("Playing melody");
    const isAngle = code.includes("Serial.print") && code.includes("Angle:");
    const isRgb = code.includes("Serial.print") && code.includes("R:");
    const isDigit = code.includes("Serial.println") && code.includes("Displaying:");
    const isServoReady = code.includes("Serial.println") && code.includes("Servo Control Ready");
    const isLightReady = code.includes("Serial.println") && code.includes("Light Sensor Ready");

    if (isButtonLed) {
      const line = this.stepCounter % 2 === 0 ? "LED ON" : "LED OFF";
      this.serialBuffer.push(line);
      this.serialCallbacks.forEach((cb) => cb(line));
    } else if (isLight) {
      const val = Math.floor(Math.random() * 1023);
      const line = "Light: " + val + " | Status: " + (val < 500 ? "DARK" : "BRIGHT");
      this.serialBuffer.push(line);
      this.serialCallbacks.forEach((cb) => cb(line));
    } else if (isMelody) {
      const notes = ["262 Hz", "294 Hz", "330 Hz", "349 Hz", "392 Hz", "440 Hz", "494 Hz", "523 Hz"];
      const idx = (this.stepCounter / 5) % notes.length;
      this.serialBuffer.push(notes[idx]);
      this.serialCallbacks.forEach((cb) => cb(notes[idx]));
    } else if (isAngle) {
      const angle = Math.floor(Math.random() * 180);
      const line = "Angle: " + angle;
      this.serialBuffer.push(line);
      this.serialCallbacks.forEach((cb) => cb(line));
    } else if (isRgb) {
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      const line = "R:" + r + " G:" + g + " B:" + b;
      this.serialBuffer.push(line);
      this.serialCallbacks.forEach((cb) => cb(line));
    } else if (isDigit) {
      const digit = this.stepCounter % 10;
      const line = "Displaying: " + digit;
      this.serialBuffer.push(line);
      this.serialCallbacks.forEach((cb) => cb(line));
    } else if (isServoReady) {
      if (this.stepCounter <= 5) {
        const line = "Servo Control Ready";
        this.serialBuffer.push(line);
        this.serialCallbacks.forEach((cb) => cb(line));
      }
    } else if (isLightReady) {
      if (this.stepCounter <= 5) {
        const line = "Light Sensor Ready";
        this.serialBuffer.push(line);
        this.serialCallbacks.forEach((cb) => cb(line));
      }
    }
  }
}

let simulationInstance: AvrSimulation | null = null;

export function getSimulation(): AvrSimulation {
  if (!simulationInstance) {
    simulationInstance = new AvrSimulation();
  }
  return simulationInstance;
}
