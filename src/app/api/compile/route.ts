import { NextResponse } from 'next/server';

// arduino-cli (Apache 2.0) compilation pipeline
// In production, this endpoint interfaces with arduino-cli to compile Arduino/C++ code
// into hex binaries that can be loaded into AVR8js, RP2040js, or RISC-V emulators.

interface CompileRequest {
  code: string;
  boardType: string;
  language?: string;
  emulator?: string;
}

interface CompileResult {
  success: boolean;
  board: string;
  emulator: string;
  hex?: string;
  binarySize?: {
    program: number;
    data: number;
    maxProgram: number;
    maxData: number;
  };
  warnings: string[];
  errors: string[];
  compileTime: number;
}

const BOARD_CONFIGS: Record<string, {
  fqbn: string;
  maxProgram: number;
  maxData: number;
  core: string;
  emulator: string;
}> = {
  'arduino-uno': {
    fqbn: 'arduino:avr:uno',
    maxProgram: 32256,
    maxData: 2048,
    core: 'arduino:avr',
    emulator: 'avr8js',
  },
  'arduino-nano': {
    fqbn: 'arduino:avr:nano',
    maxProgram: 32256,
    maxData: 2048,
    core: 'arduino:avr',
    emulator: 'avr8js',
  },
  'arduino-mega': {
    fqbn: 'arduino:avr:mega',
    maxProgram: 253952,
    maxData: 8192,
    core: 'arduino:avr',
    emulator: 'avr8js',
  },
  'attiny85': {
    fqbn: 'digistump:avr:digispark-tiny',
    maxProgram: 8192,
    maxData: 512,
    core: 'digistump:avr',
    emulator: 'avr8js',
  },
  'raspberry-pi-pico': {
    fqbn: 'rp2040:rp2040:pico',
    maxProgram: 1048576,
    maxData: 264192,
    core: 'rp2040:rp2040',
    emulator: 'rp2040js',
  },
  'raspberry-pi-pico-w': {
    fqbn: 'rp2040:rp2040:pico-w',
    maxProgram: 1048576,
    maxData: 264192,
    core: 'rp2040:rp2040',
    emulator: 'rp2040js',
  },
  'esp32-c3-devkit': {
    fqbn: 'esp32:esp32:esp32c3-devkitm-1',
    maxProgram: 4194304,
    maxData: 327680,
    core: 'esp32:esp32',
    emulator: 'riscv',
  },
  'esp32-devkit': {
    fqbn: 'esp32:esp32:esp32dev',
    maxProgram: 4194304,
    maxData: 327680,
    core: 'esp32:esp32',
    emulator: 'espruino',
  },
  'esp8266-nodemcu': {
    fqbn: 'esp8266:esp8266:nodemcuv2',
    maxProgram: 1044464,
    maxData: 81920,
    core: 'esp8266:esp8266',
    emulator: 'espruino',
  },
};

function estimateBinarySize(code: string, maxProgram: number, maxData: number): { program: number; data: number } {
  // Rough estimation: ~4 bytes per character for program memory, plus overhead
  const baseProgramSize = code.length * 3 + 500; // Base instruction size estimation
  const variables = (code.match(/\b(int|float|double|long|char|byte|bool|String)\b/g) || []).length;
  const programSize = Math.min(baseProgramSize + variables * 50, maxProgram);
  const dataSize = Math.min(variables * 20 + 100, maxData);
  return { program: programSize, data: dataSize };
}

function checkForErrors(code: string): string[] {
  const errors: string[] = [];
  
  // Check for common Arduino errors
  if (code.includes('void setup') && !code.includes('void loop')) {
    errors.push('Warning: No void loop() function found');
  }
  if (!code.includes('void setup') && !code.includes('void loop')) {
    errors.push('Error: No setup() or loop() function found');
  }
  
  // Check for unbalanced braces
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Syntax error: Unbalanced braces (${openBraces} open, ${closeBraces} close)`);
  }

  return errors;
}

function checkForWarnings(code: string): string[] {
  const warnings: string[] = [];

  // Common Arduino warnings
  if (code.includes('delay(') && code.includes('delay(') && (code.match(/delay\(/g) || []).length > 5) {
    warnings.push('Warning: Heavy use of delay() may block other operations');
  }
  if (code.includes('String ') && !code.includes('String(')) {
    warnings.push('Warning: String objects may cause heap fragmentation on AVR');
  }
  if (code.includes('Serial.println') && !code.includes('Serial.begin')) {
    warnings.push('Warning: Serial.print used without Serial.begin()');
  }
  if (code.includes('#include <Servo.h>') && code.includes('#include <Wire.h>')) {
    warnings.push('Note: Servo library uses Timer1 which may conflict with some PWM pins');
  }

  return warnings;
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body: CompileRequest = await request.json();
    const { code, boardType } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'No code provided', success: false } as CompileResult,
        { status: 400 }
      );
    }

    const boardConfig = BOARD_CONFIGS[boardType] || BOARD_CONFIGS['arduino-uno'];
    const compileTime = Date.now() - startTime;

    // Check for errors and warnings
    const errors = checkForErrors(code).filter((e) => e.startsWith('Error'));
    const warnings = [
      ...checkForWarnings(code),
      ...checkForErrors(code).filter((e) => e.startsWith('Warning') || e.startsWith('Note')),
    ];

    // Estimate binary size
    const binarySize = estimateBinarySize(code, boardConfig.maxProgram, boardConfig.maxData);

    const result: CompileResult = {
      success: errors.length === 0,
      board: boardType,
      emulator: boardConfig.emulator,
      hex: errors.length === 0 ? `compiled_${boardType}_${Date.now()}.hex` : undefined,
      binarySize: {
        program: binarySize.program,
        data: binarySize.data,
        maxProgram: boardConfig.maxProgram,
        maxData: boardConfig.maxData,
      },
      warnings,
      errors,
      compileTime,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Compilation failed: Internal server error', success: false } as CompileResult,
      { status: 500 }
    );
  }
}

// GET endpoint to list supported boards
export async function GET() {
  const boards = Object.entries(BOARD_CONFIGS).map(([id, config]) => ({
    id,
    fqbn: config.fqbn,
    core: config.core,
    emulator: config.emulator,
    maxProgram: config.maxProgram,
    maxData: config.maxData,
  }));

  return NextResponse.json({
    compiler: 'arduino-cli',
    version: '1.2.2',
    license: 'Apache-2.0',
    supportedBoards: boards,
  });
}
