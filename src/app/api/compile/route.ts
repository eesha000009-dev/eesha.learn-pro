import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompileRequest {
  code: string;
  boardType: string;
  language?: string;
}

interface CompileError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

interface CompileStats {
  lines: number;
  functions: number;
  variables: number;
  includes: string[];
  pinUsage: Record<string, string[]>;
}

interface CompileResponse {
  success: boolean;
  errors: CompileError[];
  warnings: CompileError[];
  hex: null;
  stats: CompileStats;
}

// ---------------------------------------------------------------------------
// Board pin configuration
// ---------------------------------------------------------------------------

interface BoardPins {
  digital: number[];
  analog: string[];
  prefix: string;
}

const BOARD_PIN_CONFIG: Record<string, BoardPins> = {
  'arduino-uno': {
    digital: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    analog: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
    prefix: '',
  },
  'arduino-nano': {
    digital: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    analog: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
    prefix: '',
  },
  'arduino-mega': {
    digital: Array.from({ length: 54 }, (_, i) => i),
    analog: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'],
    prefix: '',
  },
  'attiny85': {
    digital: [0, 1, 2, 3, 4, 5],
    analog: ['A0', 'A1', 'A2', 'A3'],
    prefix: '',
  },
  'raspberry-pi-pico': {
    digital: Array.from({ length: 29 }, (_, i) => i),
    analog: [],
    prefix: 'GP',
  },
  'raspberry-pi-pico-w': {
    digital: Array.from({ length: 29 }, (_, i) => i),
    analog: [],
    prefix: 'GP',
  },
  'esp32-devkit': {
    digital: Array.from({ length: 40 }, (_, i) => i),
    analog: [],
    prefix: '',
  },
  'esp32-c3-devkit': {
    digital: Array.from({ length: 22 }, (_, i) => i),
    analog: [],
    prefix: '',
  },
  'esp8266-nodemcu': {
    digital: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16],
    analog: ['A0'],
    prefix: 'D',
  },
  'stm32-nucleo-f4': {
    digital: Array.from({ length: 20 }, (_, i) => i),
    analog: [],
    prefix: '',
  },
  'stm32-nucleo-f1': {
    digital: Array.from({ length: 20 }, (_, i) => i),
    analog: [],
    prefix: '',
  },
  'risc-v-feather': {
    digital: Array.from({ length: 22 }, (_, i) => i),
    analog: [],
    prefix: '',
  },
};

const DEFAULT_BOARD_CONFIG: BoardPins = {
  digital: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  analog: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
  prefix: '',
};

// ---------------------------------------------------------------------------
// Arduino built-in functions & constants
// ---------------------------------------------------------------------------

const VALID_PIN_MODES = new Set(['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN']);

const KNOWN_FUNCTIONS = new Set([
  'setup', 'loop', 'delay', 'delayMicroseconds', 'millis', 'micros',
  'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite',
  'analogReference', 'tone', 'noTone', 'pulseIn', 'shiftOut', 'shiftIn',
  'map', 'constrain', 'min', 'max', 'abs', 'pow', 'sqrt', 'sin', 'cos', 'tan',
  'random', 'randomSeed', 'attachInterrupt', 'detachInterrupt',
  'Serial_begin', 'Serial_end', 'Serial_print', 'Serial_println',
  'Serial_available', 'Serial_read', 'Serial_readString', 'Serial_flush',
  'Serial_peek', 'Serial_find', 'Serial_findUntil', 'Serial_parseInt',
  'Serial_parseFloat', 'Serial_timedPeek', 'Serial_timedRead',
  'Wire_begin', 'Wire_requestFrom', 'Wire_beginTransmission',
  'Wire_endTransmission', 'Wire_write', 'Wire_available', 'Wire_read',
  'SPI_begin', 'SPI_end', 'SPI_transfer', 'SPI_setDataMode',
  'SPI_setClockDivider', 'main',
]);

const ARDUINO_TYPES = new Set([
  'int', 'float', 'double', 'long', 'short', 'char', 'byte', 'bool',
  'unsigned', 'signed', 'void', 'String', 'boolean',
  'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t',
  'int8_t', 'int16_t', 'int32_t', 'int64_t',
  'size_t', 'word',
]);

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** Split code into lines (handles both LF and CRLF) */
function splitLines(code: string): string[] {
  return code.split(/\r?\n/);
}

/** Remove single-line and block comments from a single line */
function stripComments(line: string): string {
  let result = '';
  let inBlock = false;
  for (let i = 0; i < line.length; i++) {
    if (!inBlock && i + 1 < line.length && line[i] === '/' && line[i + 1] === '/') {
      break; // rest is comment
    }
    if (!inBlock && i + 1 < line.length && line[i] === '/' && line[i + 1] === '*') {
      inBlock = true;
      i++;
      continue;
    }
    if (inBlock && i + 1 < line.length && line[i] === '*' && line[i + 1] === '/') {
      inBlock = false;
      i++;
      continue;
    }
    if (!inBlock) {
      result += line[i];
    }
  }
  return result;
}

/** Remove string literals to avoid false matches inside them */
function stripStrings(code: string): string {
  return code.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

/** Check if line is inside a block comment by tracking state across lines */
function getBlockCommentRanges(lines: string[]): [number, number][] {
  const ranges: [number, number][] = [];
  let inBlock = false;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      if (!inBlock && j + 1 < line.length && line[j] === '/' && line[j + 1] === '*') {
        inBlock = true;
        startLine = i;
        j++;
      } else if (inBlock && j + 1 < line.length && line[j] === '*' && line[j + 1] === '/') {
        inBlock = false;
        ranges.push([startLine, i]);
        j++;
      }
    }
  }

  if (inBlock) {
    ranges.push([startLine, lines.length - 1]);
  }

  return ranges;
}

/** Check if a line number is inside a block comment */
function isInsideBlockComment(lineNum: number, commentRanges: [number, number][]): boolean {
  return commentRanges.some(([start, end]) => lineNum >= start && lineNum <= end);
}

/** Check if a line is a single-line comment */
function isSingleLineComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*');
}

/** Parse #include directives */
function parseIncludes(lines: string[]): string[] {
  const includes: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^#include\s+[<"]([^>"]+)[">]/);
    if (match) {
      includes.push(match[1]);
    }
  }
  return includes;
}

/** Parse function definitions */
function parseFunctions(lines: string[], commentRanges: [number, number][]): { name: string; line: number }[] {
  const functions: { name: string; line: number }[] = [];
  const funcRegex =
    /(?:void|int|float|double|long|short|char|byte|bool|unsigned|signed|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|boolean|word)\s+(\*?\s*\w+)\s*\([^)]*\)\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;
    if (isSingleLineComment(lines[i])) continue;

    const stripped = stripComments(lines[i]);
    const match = stripped.match(funcRegex);
    if (match) {
      functions.push({ name: match[1].replace(/\s*\*\s*/g, '*').trim(), line: i + 1 });
    }
  }
  return functions;
}

/** Parse global variable declarations (outside of any function body) */
function parseGlobalVariables(
  lines: string[],
  commentRanges: [number, number][],
  functions: { name: string; line: number }[],
): { name: string; line: number; type: string }[] {
  const variables: { name: string; line: number; type: string }[] = [];

  // Determine which lines are inside function bodies
  const funcBodyRanges = getFunctionBodyRanges(lines, functions);

  const varRegex =
    /(?:const\s+)?(?:int|float|double|long|short|char|byte|bool|unsigned|signed|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|boolean|word)\s+(\*?\s*\w+)\s*(?:=\s*[^;]+)?;/;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;
    if (isSingleLineComment(lines[i])) continue;
    if (funcBodyRanges.some(([start, end]) => i >= start && i <= end)) continue;

    const stripped = stripComments(lines[i]);
    const match = stripped.match(varRegex);
    if (match) {
      const type = (stripped.match(
        /(?:const\s+)?(?:int|float|double|long|short|char|byte|bool|unsigned|signed|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|boolean|word)/,
      ) || [])[0];
      variables.push({ name: match[1].replace(/\s*\*\s*/g, '*').trim(), line: i + 1, type: type || 'unknown' });
    }
  }
  return variables;
}

/** Get line ranges for function bodies */
function getFunctionBodyRanges(
  lines: string[],
  functions: { name: string; line: number }[],
): [number, number][] {
  const ranges: [number, number][] = [];

  for (const func of functions) {
    const startLine = func.line - 1;
    let braceCount = 0;
    let foundOpen = false;

    for (let i = startLine; i < lines.length; i++) {
      const stripped = stripStrings(stripComments(lines[i]));
      for (const ch of stripped) {
        if (ch === '{') {
          braceCount++;
          foundOpen = true;
        } else if (ch === '}') {
          braceCount--;
        }
      }
      if (foundOpen && braceCount <= 0) {
        ranges.push([startLine, i]);
        break;
      }
    }
  }

  return ranges;
}

/** Extract pin usage from function calls like pinMode(13, OUTPUT), digitalWrite(7, HIGH) */
function parsePinUsage(lines: string[], commentRanges: [number, number][]): Record<string, string[]> {
  const pinUsage: Record<string, string[]> = {};

  const addUsage = (pin: string, usage: string) => {
    if (!pinUsage[pin]) {
      pinUsage[pin] = [];
    }
    if (!pinUsage[pin].includes(usage)) {
      pinUsage[pin].push(usage);
    }
  };

  const pinArgRegex = /pinMode\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/;
  const digitalWriteRegex = /digitalWrite\s*\(\s*(\w+)\s*,/;
  const digitalReadRegex = /digitalRead\s*\(\s*(\w+)\s*\)/;
  const analogWriteRegex = /analogWrite\s*\(\s*(\w+)\s*,/;
  const analogReadRegex = /analogRead\s*\(\s*(\w+)\s*\)/;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;
    if (isSingleLineComment(lines[i])) continue;

    const stripped = stripComments(lines[i]);

    const pm = stripped.match(pinArgRegex);
    if (pm) {
      addUsage(pm[1], `pinMode(${pm[2]})`);
    }

    const dw = stripped.match(digitalWriteRegex);
    if (dw) {
      addUsage(dw[1], 'digitalWrite');
    }

    const dr = stripped.match(digitalReadRegex);
    if (dr) {
      addUsage(dr[1], 'digitalRead');
    }

    const aw = stripped.match(analogWriteRegex);
    if (aw) {
      addUsage(aw[1], 'analogWrite');
    }

    const ar = stripped.match(analogReadRegex);
    if (ar) {
      addUsage(ar[1], 'analogRead');
    }
  }

  return pinUsage;
}

// ---------------------------------------------------------------------------
// Validation checks
// ---------------------------------------------------------------------------

function checkRequiredFunctions(
  lines: string[],
  commentRanges: [number, number][],
): CompileError[] {
  const errors: CompileError[] = [];
  let hasSetup = false;
  let hasLoop = false;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;
    const stripped = stripComments(lines[i]).trim();
    if (/\bvoid\s+setup\s*\(/.test(stripped)) {
      hasSetup = true;
    }
    if (/\bvoid\s+loop\s*\(/.test(stripped)) {
      hasLoop = true;
    }
  }

  if (!hasSetup) {
    errors.push({
      line: 0,
      message: 'Missing required function: void setup()',
      severity: 'error',
    });
  }
  if (!hasLoop) {
    errors.push({
      line: 0,
      message: 'Missing required function: void loop()',
      severity: 'error',
    });
  }

  return errors;
}

function checkUnmatchedBraces(code: string, lines: string[]): CompileError[] {
  const errors: CompileError[] = [];
  const codeNoStr = stripStrings(code);
  const codeNoComment = codeNoStr.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  let braceCount = 0;
  const lineStarts: number[] = [0];
  for (let i = 0; i < codeNoComment.length; i++) {
    if (codeNoComment[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }

  for (let i = 0; i < codeNoComment.length; i++) {
    const ch = codeNoComment[i];
    if (ch === '{') braceCount++;
    else if (ch === '}') braceCount--;

    if (braceCount < 0) {
      // Find line number
      let lineNum = 0;
      for (let j = lineStarts.length - 1; j >= 0; j--) {
        if (lineStarts[j] <= i) {
          lineNum = j + 1;
          break;
        }
      }
      errors.push({
        line: lineNum,
        message: 'Unmatched closing brace \'}\'',
        severity: 'error',
      });
      braceCount = 0; // recover
    }
  }

  if (braceCount > 0) {
    errors.push({
      line: 0,
      message: `Unmatched braces: ${braceCount} unclosed '{' brace(s)`,
      severity: 'error',
    });
  }

  return errors;
}

function checkMissingSemicolons(
  lines: string[],
  commentRanges: [number, number][],
): CompileError[] {
  const errors: CompileError[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;
    if (isSingleLineComment(lines[i])) continue;

    const trimmed = stripComments(lines[i]).trim();

    // Skip preprocessor, empty lines, braces-only, control flow
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed === '{' ||
      trimmed === '}' ||
      trimmed.endsWith('{') ||
      trimmed.endsWith('}') ||
      trimmed === 'case ' || trimmed.startsWith('case ') ||
      trimmed.startsWith('default:') ||
      trimmed === 'public:' || trimmed === 'private:' || trimmed === 'protected:'
    ) {
      continue;
    }

    // Skip lines that end with a comment after code
    const codePart = trimmed.replace(/\/\/.*$/, '').trim();
    if (!codePart) continue;

    // Lines that should end with a semicolon (statements, declarations, function calls)
    const isStatement = /^(?!(if|else|for|while|do|switch|return|break|continue|goto)\b).+\)$/.test(codePart) ||
      /(?:^\s*(?:int|float|double|long|short|char|byte|bool|unsigned|signed|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|boolean|word|void|const|static|volatile|extern)\b)/.test(codePart);

    const endsWithSemicolon = codePart.endsWith(';');

    if (isStatement && !endsWithSemicolon && !codePart.includes('{') && !codePart.includes('}')) {
      // Only flag if it looks like a real statement
      if (/[=;]/.test(codePart) || /(?:digitalWrite|digitalRead|analogWrite|analogRead|pinMode|delay|Serial\.\w+|tone|noTone|map|constrain)\s*\(/.test(codePart)) {
        errors.push({
          line: i + 1,
          message: 'Possible missing semicolon at end of line',
          severity: 'warning',
        });
      }
    }
  }

  return errors;
}

function checkPinModes(
  lines: string[],
  commentRanges: [number, number][],
): CompileError[] {
  const errors: CompileError[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;
    if (isSingleLineComment(lines[i])) continue;

    const stripped = stripComments(lines[i]);
    const match = stripped.match(/pinMode\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
    if (match) {
      const mode = match[2];
      if (!VALID_PIN_MODES.has(mode)) {
        errors.push({
          line: i + 1,
          message: `Invalid pin mode '${mode}'. Valid modes: INPUT, OUTPUT, INPUT_PULLUP`,
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

function checkSerialBegin(
  lines: string[],
  commentRanges: [number, number][],
): CompileError[] {
  const errors: CompileError[] = [];
  let usesSerial = false;
  let hasSerialBegin = false;
  let serialPrintLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;

    const stripped = stripComments(lines[i]);

    if (/\bSerial\.(?:print|println|available|read|readString|peek|find)\s*\(/.test(stripped)) {
      usesSerial = true;
      if (serialPrintLine === 0) serialPrintLine = i + 1;
    }
    if (/\bSerial\.begin\s*\(/.test(stripped)) {
      hasSerialBegin = true;
    }
  }

  if (usesSerial && !hasSerialBegin) {
    errors.push({
      line: serialPrintLine,
      message: 'Serial.print/println used without calling Serial.begin(baud) in setup()',
      severity: 'warning',
    });
  }

  return errors;
}

function checkBoardPins(
  lines: string[],
  commentRanges: [number, number][],
  boardType: string,
): CompileError[] {
  const errors: CompileError[] = [];
  const config = BOARD_PIN_CONFIG[boardType] || DEFAULT_BOARD_CONFIG;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;
    if (isSingleLineComment(lines[i])) continue;

    const stripped = stripComments(lines[i]);
    const pinMatches = stripped.matchAll(
      /(?:pinMode|digitalWrite|digitalRead|analogWrite|analogRead)\s*\(\s*(\w+)\s*,/g,
    );

    for (const pm of pinMatches) {
      const pin = pm[1];
      const line = i + 1;

      // Check if it's a numeric pin
      const numericPin = parseInt(pin, 10);
      if (!isNaN(numericPin) && pin === String(numericPin)) {
        if (!config.digital.includes(numericPin)) {
          errors.push({
            line,
            message: `Invalid pin ${config.prefix}${numericPin} for board '${boardType}'. Valid digital pins: ${config.digital.slice(0, 5).map((p) => config.prefix + p).join(', ')}${config.digital.length > 5 ? '...' : ''}`,
            severity: 'warning',
          });
        }
      } else if (/^A\d+$/i.test(pin)) {
        const analogNum = parseInt(pin.slice(1), 10);
        const validAnalog = config.analog.some((a) => a.toUpperCase() === pin.toUpperCase());
        if (!validAnalog && config.analog.length > 0) {
          errors.push({
            line,
            message: `Invalid analog pin ${pin.toUpperCase()} for board '${boardType}'. Valid analog pins: ${config.analog.join(', ')}`,
            severity: 'warning',
          });
        }
      } else if (/^GP\d+$/i.test(pin)) {
        const gpNum = parseInt(pin.slice(2), 10);
        if (config.prefix === 'GP') {
          if (!config.digital.includes(gpNum)) {
            errors.push({
              line,
              message: `Invalid pin GP${gpNum} for board '${boardType}'`,
              severity: 'warning',
            });
          }
        }
      } else if (/^D\d+$/i.test(pin)) {
        const dNum = parseInt(pin.slice(1), 10);
        if (config.prefix === 'D') {
          if (!config.digital.includes(dNum)) {
            errors.push({
              line,
              message: `Invalid pin D${dNum} for board '${boardType}'`,
              severity: 'warning',
            });
          }
        }
      }
      // Named constants like LED_BUILTIN, INPUT, etc. are allowed
    }
  }

  return errors;
}

function checkInvalidFunctionCalls(
  lines: string[],
  commentRanges: [number, number][],
): CompileError[] {
  const errors: CompileError[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;
    if (isSingleLineComment(lines[i])) continue;

    const stripped = stripComments(lines[i]);

    // Match function calls: identifier followed by (
    const calls = stripped.matchAll(/\b([a-zA-Z_]\w*)\s*\(/g);
    for (const call of calls) {
      const name = call[1];

      // Skip types, keywords, and known Arduino functions
      if (
        ARDUINO_TYPES.has(name) ||
        name === 'if' || name === 'for' || name === 'while' ||
        name === 'switch' || name === 'return' || name === 'case' ||
        name === 'sizeof' || name === 'typeof' ||
        KNOWN_FUNCTIONS.has(name) ||
        name === 'main' ||
        name === 'class' || name === 'struct'
      ) {
        continue;
      }

      // Skip Serial.*, Wire.*, SPI.* object methods (already handled)
      if (name === 'Serial' || name === 'Wire' || name === 'SPI') continue;

      // Skip known library patterns
      if (
        name.startsWith('WiFi') ||
        name.startsWith('BLE') ||
        name.startsWith('HTTP') ||
        name.startsWith('Servo') ||
        name.startsWith('LiquidCrystal')
      ) {
        continue;
      }
    }
  }

  return errors;
}

function checkCommonWarnings(
  lines: string[],
  commentRanges: [number, number][],
): CompileError[] {
  const warnings: CompileError[] = [];

  let delayCount = 0;
  let lastDelayLine = 0;
  let usesStringType = false;
  let stringLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (isInsideBlockComment(i, commentRanges)) continue;

    const stripped = stripComments(lines[i]);

    const delays = stripped.match(/\bdelay\s*\(/g);
    if (delays) {
      delayCount += delays.length;
      if (lastDelayLine === 0) lastDelayLine = i + 1;
    }

    if (/\bString\s+\w+/.test(stripped) && !/String\s*\(/.test(stripped)) {
      if (!usesStringType) {
        usesStringType = true;
        stringLine = i + 1;
      }
    }
  }

  if (delayCount > 5) {
    warnings.push({
      line: lastDelayLine,
      message: `Heavy use of delay() (${delayCount} calls) may block other operations. Consider using millis() for non-blocking timing.`,
      severity: 'warning',
    });
  }

  if (usesStringType) {
    warnings.push({
      line: stringLine,
      message: 'String objects may cause heap fragmentation on AVR boards. Consider using char arrays.',
      severity: 'warning',
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Main compile handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse<CompileResponse>> {
  try {
    const body: CompileRequest = await request.json();
    const { code, boardType = 'arduino-uno' } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          success: false,
          errors: [{ line: 0, message: 'No code provided', severity: 'error' }],
          warnings: [],
          hex: null,
          stats: { lines: 0, functions: 0, variables: 0, includes: [], pinUsage: {} },
        },
        { status: 400 },
      );
    }

    const lines = splitLines(code);
    const commentRanges = getBlockCommentRanges(lines);

    // Parse code structure
    const includes = parseIncludes(lines);
    const functions = parseFunctions(lines, commentRanges);
    const globalVariables = parseGlobalVariables(lines, commentRanges, functions);
    const pinUsage = parsePinUsage(lines, commentRanges);

    // Run all validation checks
    const requiredFnErrors = checkRequiredFunctions(lines, commentRanges);
    const braceErrors = checkUnmatchedBraces(code, lines);
    const semicolonWarnings = checkMissingSemicolons(lines, commentRanges);
    const pinModeErrors = checkPinModes(lines, commentRanges);
    const serialWarnings = checkSerialBegin(lines, commentRanges);
    const pinWarnings = checkBoardPins(lines, commentRanges, boardType);
    const invalidCallErrors = checkInvalidFunctionCalls(lines, commentRanges);
    const commonWarnings = checkCommonWarnings(lines, commentRanges);

    // Separate errors and warnings
    const allErrors: CompileError[] = [
      ...requiredFnErrors,
      ...braceErrors,
      ...pinModeErrors,
    ];

    const allWarnings: CompileError[] = [
      ...semicolonWarnings,
      ...serialWarnings,
      ...pinWarnings,
      ...commonWarnings,
      ...invalidCallErrors,
    ];

    // Deduplicate by line + message
    const seen = new Set<string>();
    const uniqueErrors = allErrors.filter((e) => {
      const key = `${e.line}:${e.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const seenW = new Set<string>();
    const uniqueWarnings = allWarnings.filter((e) => {
      const key = `${e.line}:${e.message}`;
      if (seenW.has(key)) return false;
      seenW.add(key);
      return true;
    });

    const hasErrors = uniqueErrors.length > 0;

    return NextResponse.json({
      success: !hasErrors,
      errors: uniqueErrors,
      warnings: uniqueWarnings,
      hex: null,
      stats: {
        lines: lines.length,
        functions: functions.length,
        variables: globalVariables.length,
        includes,
        pinUsage,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        errors: [{ line: 0, message: 'Internal server error during compilation', severity: 'error' }],
        warnings: [],
        hex: null,
        stats: { lines: 0, functions: 0, variables: 0, includes: [], pinUsage: {} },
      },
      { status: 500 },
    );
  }
}

// GET endpoint to list supported boards
export async function GET() {
  const boards = Object.entries(BOARD_PIN_CONFIG).map(([id, config]) => ({
    id,
    digitalPins: config.digital.length,
    analogPins: config.analog.length,
    pinPrefix: config.prefix,
  }));

  return NextResponse.json({
    supportedBoards: boards,
  });
}
