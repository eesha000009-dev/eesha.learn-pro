'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSimulatorStore } from '@/store/simulator-store';
import type { editor } from 'monaco-editor';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-950">
      <div className="flex items-center gap-2 text-zinc-600">
        <div className="h-4 w-4 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs">Loading editor...</span>
      </div>
    </div>
  ),
});

// ─── Language & icon maps ────────────────────────────────────────────────────

const LANGUAGE_MAP: Record<string, string> = {
  c: 'arduino',
  cpp: 'cpp',
  python: 'python',
  circuit: 'typescript',
  json: 'json',
};

const LANGUAGE_ICONS: Record<string, string> = {
  c: 'C',
  cpp: 'C++',
  python: 'PY',
  circuit: 'TSX',
  kicad: 'KICAD',
  json: 'JSON',
};

const LANGUAGE_LABELS: Record<string, string> = {
  arduino: 'Arduino C',
  cpp: 'C++',
  python: 'Python',
  typescript: 'TypeScript',
  json: 'JSON',
};

// ─── Arduino keywords ────────────────────────────────────────────────────────

const ARDUINO_KEYWORDS = [
  'setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead',
  'analogWrite', 'analogRead', 'delay', 'millis', 'Serial',
  'tone', 'noTone', 'map', 'constrain', 'HIGH', 'LOW',
  'INPUT', 'OUTPUT', 'LED_BUILTIN',
];

const ARDUINO_FUNCTIONS = [
  {
    label: 'setup',
    detail: 'void setup()',
    documentation: 'Called once when the sketch starts. Use to initialize pins, begin serial, etc.',
    insertText: 'void setup() {\n\t$0\n}',
    insertTextRules: 4, // InsertTextRule.InsertAsSnippet
  },
  {
    label: 'loop',
    detail: 'void loop()',
    documentation: 'Called repeatedly after setup(). Main program logic goes here.',
    insertText: 'void loop() {\n\t$0\n}',
    insertTextRules: 4,
  },
  {
    label: 'pinMode',
    detail: 'void pinMode(uint8_t pin, uint8_t mode)',
    documentation: 'Configures a pin as INPUT or OUTPUT.\nExample: pinMode(13, OUTPUT);',
    insertText: 'pinMode(${1:pin}, ${2:OUTPUT});',
    insertTextRules: 4,
  },
  {
    label: 'digitalWrite',
    detail: 'void digitalWrite(uint8_t pin, uint8_t val)',
    documentation: 'Write HIGH or LOW to a digital pin.\nExample: digitalWrite(13, HIGH);',
    insertText: 'digitalWrite(${1:pin}, ${2:HIGH});',
    insertTextRules: 4,
  },
  {
    label: 'digitalRead',
    detail: 'int digitalRead(uint8_t pin)',
    documentation: 'Read the value from a digital pin (HIGH or LOW).\nExample: int val = digitalRead(7);',
    insertText: 'digitalRead(${1:pin})',
    insertTextRules: 4,
  },
  {
    label: 'analogWrite',
    detail: 'void analogWrite(uint8_t pin, int val)',
    documentation: 'Write a PWM value (0-255) to a pin.\nExample: analogWrite(9, 128);',
    insertText: 'analogWrite(${1:pin}, ${2:0});',
    insertTextRules: 4,
  },
  {
    label: 'analogRead',
    detail: 'int analogRead(uint8_t pin)',
    documentation: 'Read an analog value (0-1023) from an analog pin.\nExample: int val = analogRead(A0);',
    insertText: 'analogRead(${1:A0})',
    insertTextRules: 4,
  },
  {
    label: 'delay',
    detail: 'void delay(unsigned long ms)',
    documentation: 'Pause for the given number of milliseconds.\nExample: delay(1000);',
    insertText: 'delay(${1:1000});',
    insertTextRules: 4,
  },
  {
    label: 'millis',
    detail: 'unsigned long millis()',
    documentation: 'Returns the number of milliseconds since the board started.',
    insertText: 'millis()',
    insertTextRules: 4,
  },
  {
    label: 'tone',
    detail: 'void tone(uint8_t pin, unsigned int freq, unsigned long duration)',
    documentation: 'Generate a tone on a pin.\nExample: tone(8, 440, 500);',
    insertText: 'tone(${1:pin}, ${2:frequency}${3:, ${4:duration}});',
    insertTextRules: 4,
  },
  {
    label: 'noTone',
    detail: 'void noTone(uint8_t pin)',
    documentation: 'Stop generating a tone on a pin.\nExample: noTone(8);',
    insertText: 'noTone(${1:pin});',
    insertTextRules: 4,
  },
  {
    label: 'map',
    detail: 'long map(long val, long fromLow, long fromHigh, long toLow, long toHigh)',
    documentation: 'Re-maps a number from one range to another.\nExample: map(val, 0, 1023, 0, 255);',
    insertText: 'map(${1:value}, ${2:fromLow}, ${3:fromHigh}, ${4:toLow}, ${5:toHigh})',
    insertTextRules: 4,
  },
  {
    label: 'constrain',
    detail: 'long constrain(long amt, long low, long high)',
    documentation: 'Constrain a number to be within a range.\nExample: constrain(val, 0, 255);',
    insertText: 'constrain(${1:value}, ${2:min}, ${3:max})',
    insertTextRules: 4,
  },
];

const ARDUINO_CONSTANTS = [
  { label: 'HIGH', detail: 'const int HIGH = 1', documentation: 'Logic high level (1)' },
  { label: 'LOW', detail: 'const int LOW = 0', documentation: 'Logic low level (0)' },
  { label: 'INPUT', detail: 'const int INPUT = 0', documentation: 'Pin mode: digital input' },
  { label: 'OUTPUT', detail: 'const int OUTPUT = 1', documentation: 'Pin mode: digital output' },
  { label: 'INPUT_PULLUP', detail: 'const int INPUT_PULLUP = 2', documentation: 'Pin mode: input with internal pull-up' },
  { label: 'LED_BUILTIN', detail: 'const int LED_BUILTIN = 13', documentation: 'Built-in LED pin number' },
  { label: 'A0', detail: 'const int A0 = 14', documentation: 'Analog input pin A0' },
  { label: 'A1', detail: 'const int A1 = 15', documentation: 'Analog input pin A1' },
  { label: 'A2', detail: 'const int A2 = 16', documentation: 'Analog input pin A2' },
  { label: 'A3', detail: 'const int A3 = 17', documentation: 'Analog input pin A3' },
  { label: 'A4', detail: 'const int A4 = 18', documentation: 'Analog input pin A4 (SDA)' },
  { label: 'A5', detail: 'const int A5 = 19', documentation: 'Analog input pin A5 (SCL)' },
];

const ARDUINO_SNIPPETS = [
  {
    label: 'arduino-sketch',
    detail: 'Arduino Sketch',
    documentation: 'Basic Arduino sketch with setup() and loop()',
    insertText: 'void setup() {\n\t// Initialize pins and serial\n\tSerial.begin(9600);\n\tpinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n\t// Main program logic\n\t$0\n}',
    insertTextRules: 4,
    kind: 9, // CompletionItemKind.Snippet
  },
  {
    label: 'blink-led',
    detail: 'LED Blink',
    documentation: 'Basic LED blink sketch',
    insertText: 'void setup() {\n\tpinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n\tdigitalWrite(LED_BUILTIN, HIGH);\n\tdelay(1000);\n\tdigitalWrite(LED_BUILTIN, LOW);\n\tdelay(1000);\n}',
    insertTextRules: 4,
    kind: 9,
  },
  {
    label: 'button-read',
    detail: 'Button Read',
    documentation: 'Read a button on pin 2 and control LED on pin 13',
    insertText: 'const int buttonPin = 2;\nconst int ledPin = LED_BUILTIN;\nint buttonState = 0;\n\nvoid setup() {\n\tpinMode(buttonPin, INPUT_PULLUP);\n\tpinMode(ledPin, OUTPUT);\n\tSerial.begin(9600);\n}\n\nvoid loop() {\n\tbuttonState = digitalRead(buttonPin);\n\tif (buttonState == LOW) {\n\t\tdigitalWrite(ledPin, HIGH);\n\t\tSerial.println("Button pressed");\n\t} else {\n\t\tdigitalWrite(ledPin, LOW);\n\t}\n\tdelay(50);\n}',
    insertTextRules: 4,
    kind: 9,
  },
  {
    label: 'serial-print',
    detail: 'Serial Print',
    documentation: 'Print a message to the serial monitor',
    insertText: 'Serial.begin(9600);\ndelay(100);\nSerial.println("${1:Hello World}");',
    insertTextRules: 4,
    kind: 9,
  },
  {
    label: 'analog-read',
    detail: 'Analog Read',
    documentation: 'Read an analog sensor on A0 and print the value',
    insertText: 'const int sensorPin = A0;\n\nvoid setup() {\n\tSerial.begin(9600);\n\tpinMode(sensorPin, INPUT);\n}\n\nvoid loop() {\n\tint sensorValue = analogRead(sensorPin);\n\tSerial.print("Sensor: ");\n\tSerial.println(sensorValue);\n\tdelay(100);\n}',
    insertTextRules: 4,
    kind: 9,
  },
  {
    label: 'pwm-fade',
    detail: 'PWM Fade',
    documentation: 'Fade an LED in and out using PWM',
    insertText: 'const int ledPin = 9; // PWM pin\nint brightness = 0;\nint fadeAmount = 5;\n\nvoid setup() {\n\tpinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n\tanalogWrite(ledPin, brightness);\n\tbrightness = brightness + fadeAmount;\n\tif (brightness <= 0 || brightness >= 255) {\n\t\tfadeAmount = -fadeAmount;\n\t}\n\tdelay(30);\n}',
    insertTextRules: 4,
    kind: 9,
  },
  {
    label: 'tone-melody',
    detail: 'Tone Melody',
    documentation: 'Play a tone on a piezo buzzer',
    insertText: 'const int buzzerPin = 8;\n\nvoid setup() {\n\tpinMode(buzzerPin, OUTPUT);\n}\n\nvoid loop() {\n\ttone(buzzerPin, 440, 500); // 440Hz for 500ms\n\tdelay(1000);\n}',
    insertTextRules: 4,
    kind: 9,
  },
];

// ─── Eesha Dark Theme ────────────────────────────────────────────────────────

const EESHA_DARK_THEME: { base: string; inherit: boolean; rules: any[]; colors: Record<string, string> } = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Arduino keywords -> emerald
    { token: 'keyword.arduino', foreground: '10b981', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: '10b981' },
    { token: 'keyword', foreground: '10b981' },
    // Strings -> amber
    { token: 'string', foreground: 'f59e0b' },
    { token: 'string.escape', foreground: 'fbbf24' },
    // Numbers -> sky
    { token: 'number', foreground: '38bdf8' },
    { token: 'number.float', foreground: '38bdf8' },
    // Comments -> zinc-500
    { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '71717a', fontStyle: 'italic' },
    // Types -> purple
    { token: 'type', foreground: 'c084fc' },
    { token: 'type.identifier', foreground: 'c084fc' },
    // Functions -> emerald-300
    { token: 'entity.name.function', foreground: '6ee7b7' },
    { token: 'delimiter', foreground: 'a1a1aa' },
    { token: 'delimiter.bracket', foreground: 'd4d4d8' },
    // Preprocessor -> orange
    { token: 'keyword.preprocessor', foreground: 'fb923c' },
    { token: 'keyword.preprocessor.include', foreground: 'fb923c' },
    // Constants -> cyan
    { token: 'constant', foreground: '22d3ee' },
    { token: 'variable', foreground: 'e4e4e7' },
    { token: 'operator', foreground: 'a1a1aa' },
  ],
  colors: {
    'editor.background': '#09090b',
    'editor.foreground': '#e4e4e7',
    'editor.lineHighlightBackground': '#18181b',
    'editor.selectionBackground': '#10b98133',
    'editor.inactiveSelectionBackground': '#10b9811a',
    'editorCursor.foreground': '#10b981',
    'editorWhitespace.foreground': '#27272a',
    'editorIndentGuide.background': '#1c1c20',
    'editorIndentGuide.activeBackground': '#10b98130',
    'editorLineNumber.foreground': '#3f3f46',
    'editorLineNumber.activeForeground': '#71717a',
    'editorBracketMatch.background': '#10b98120',
    'editorBracketMatch.border': '#10b98150',
    'editorGutter.background': '#09090b',
    'editorWidget.background': '#0f0f12',
    'editorWidget.border': '#27272a',
    'editorSuggestWidget.background': '#0f0f12',
    'editorSuggestWidget.border': '#27272a',
    'editorSuggestWidget.selectedBackground': '#18181b',
    'editorSuggestWidget.highlightForeground': '#10b981',
    'editorHoverWidget.background': '#0f0f12',
    'editorHoverWidget.border': '#27272a',
    'editorOverviewRuler.border': '#0000',
    'scrollbarSlider.background': '#3f3f4680',
    'scrollbarSlider.hoverBackground': '#3f3f46a0',
    'scrollbarSlider.activeBackground': '#3f3f46c0',
    'minimap.background': '#09090b',
    'editorError.foreground': '#ef4444',
    'editorWarning.foreground': '#f59e0b',
    'editorInfo.foreground': '#38bdf8',
    'editorPane.background': '#09090b',
    'statusBar.background': '#18181b',
    'statusBar.foreground': '#a1a1aa',
    'statusBar.noFolderBackground': '#18181b',
    'activityBar.background': '#0a0a0c',
    'tab.activeBackground': '#09090b',
    'tab.activeForeground': '#e4e4e7',
    'tab.inactiveBackground': '#111113',
    'tab.inactiveForeground': '#71717a',
    'tab.border': '#27272a',
    'titleBar.activeBackground': '#09090b',
    'titleBar.activeForeground': '#a1a1aa',
    'input.background': '#111113',
    'input.border': '#27272a',
    'input.foreground': '#e4e4e7',
  },
};

// ─── Arduino language registration ────────────────────────────────────────────

function registerArduinoLanguage(monaco: any) {
  // Register the "arduino" language based on C
  monaco.languages.register({ id: 'arduino', extensions: ['.ino', '.pde'], aliases: ['Arduino', 'arduino'] });

  // Register a tokenizer that extends C with Arduino keywords
  monaco.languages.setMonarchTokensProvider('arduino', {
    // C base tokenizer enhanced with Arduino keywords
    keywords: [
      'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
      'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
      'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
      'void', 'while', 'with',
      // Arduino-specific
      'setup', 'loop', 'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP',
      'LED_BUILTIN', 'true', 'false', 'null',
    ],
    arduinoFunctions: [
      'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead',
      'delay', 'millis', 'tone', 'noTone', 'map', 'constrain',
    ],
    arduinoObjects: ['Serial'],
    typeKeywords: ['int', 'long', 'float', 'double', 'char', 'byte', 'boolean', 'unsigned', 'signed', 'const', 'static', 'volatile', 'extern', 'struct', 'enum', 'union', 'class', 'String'],
    operators: ['=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%', '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=', '<<=', '>>=', '>>>='],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
      root: [
        [/#include\s*<.*?>/, 'keyword.preprocessor'],
        [/#include\s*".*?"/, 'keyword.preprocessor'],
        [/#\w+/, 'keyword.preprocessor'],
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@arduinoFunctions': { token: 'keyword.arduino', next: '@afterIdentifier' },
            '@arduinoObjects': { token: 'type', next: '@afterIdentifier' },
            '@typeKeywords': 'type',
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        }],
        { include: '@whitespace' },
        [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'[^\\']'/, 'string'],
        [/'/, 'string.invalid'],
        [/@symbols/, {
          cases: { '@operators': 'operator', '@default': '' },
        }],
      ],
      afterIdentifier: [
        [/[a-zA-Z_]\w*/, { cases: { '@typeKeywords': 'type', '@keywords': 'keyword', '@default': 'identifier' } }],
        [/[ \t\r\n]+/, { token: '', next: '@pop' }],
        [/@symbols/, { cases: { '@operators': { token: 'operator', next: '@pop' }, '@default': { token: '', next: '@pop' } } }],
        ['', '', '@pop'],
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],
      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],
    },
  });

  // Configure C-style auto-closing for arduino
  monaco.languages.setLanguageConfiguration('arduino', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string', 'comment'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*#pragma\\s+region\\b'),
        end: new RegExp('^\\s*#pragma\\s+endregion\\b'),
      },
    },
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  });

  // ─── Arduino IntelliSense completion provider ────────────────────────────

  const createArduinoCompletions = () => {
    const pinItems: any[] = [];
    for (let i = 0; i <= 13; i++) {
      pinItems.push({
        label: String(i),
        detail: `Digital Pin ${i}`,
        documentation: `Arduino Uno digital pin ${i}`,
        kind: 12, // CompletionItemKind.Value
        insertText: String(i),
      });
    }
    ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].forEach((pin) => {
      pinItems.push({
        label: pin,
        detail: `Analog Pin ${pin}`,
        documentation: `Analog input pin ${pin}`,
        kind: 12,
        insertText: pin,
      });
    });

    const functionItems = ARDUINO_FUNCTIONS.map((fn) => ({
      label: fn.label,
      kind: 3, // CompletionItemKind.Function
      detail: fn.detail,
      documentation: fn.documentation,
      insertText: fn.insertText,
      insertTextRules: fn.insertTextRules,
    }));

    const constantItems = ARDUINO_CONSTANTS.map((c) => ({
      label: c.label,
      kind: 14, // CompletionItemKind.Constant
      detail: c.detail,
      documentation: c.documentation,
      insertText: c.label,
    }));

    const snippetItems = ARDUINO_SNIPPETS.map((s) => ({
      label: s.label,
      kind: s.kind,
      detail: s.detail,
      documentation: s.documentation,
      insertText: s.insertText,
      insertTextRules: s.insertTextRules,
    }));

    return [...functionItems, ...constantItems, ...pinItems, ...snippetItems];
  };

  const arduinoCompletions = createArduinoCompletions();

  monaco.languages.registerCompletionItemProvider('arduino', {
    triggerCharacters: ['.', '('],
    provideCompletionItems(model: any, position: any) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Check if we're after Serial. for Serial methods
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);
      if (textBeforeCursor.endsWith('Serial.')) {
        const serialMethods = [
          {
            label: 'begin',
            detail: 'void Serial.begin(long speed)',
            documentation: 'Sets serial data rate in bits per second (baud).\nExample: Serial.begin(9600);',
            insertText: 'begin(${1:9600});',
            insertTextRules: 4,
            kind: 3,
          },
          {
            label: 'println',
            detail: 'void Serial.println(const char* str)',
            documentation: 'Print data followed by newline to serial port.',
            insertText: 'println(${1:"${2:message}"});',
            insertTextRules: 4,
            kind: 3,
          },
          {
            label: 'print',
            detail: 'void Serial.print(const char* str)',
            documentation: 'Print data to serial port without newline.',
            insertText: 'print(${1:"${2:message}"});',
            insertTextRules: 4,
            kind: 3,
          },
          {
            label: 'available',
            detail: 'int Serial.available()',
            documentation: 'Returns the number of bytes available for reading.',
            insertText: 'available()',
            kind: 3,
          },
          {
            label: 'read',
            detail: 'int Serial.read()',
            documentation: 'Reads incoming serial data (first byte of incoming data).',
            insertText: 'read()',
            kind: 3,
          },
          {
            label: 'readString',
            detail: 'String Serial.readString()',
            documentation: 'Reads incoming serial data as a string until timeout.',
            insertText: 'readString()',
            kind: 3,
          },
        ];
        return { suggestions: serialMethods };
      }

      const suggestions = arduinoCompletions.map((item) => ({
        ...item,
        range,
      }));

      return { suggestions };
    },
  });

  // Also provide Arduino completions in C mode
  monaco.languages.registerCompletionItemProvider('c', {
    triggerCharacters: ['.'],
    provideCompletionItems(model: any, position: any) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Only offer Arduino completions if the file looks like Arduino code
      const content = model.getValue();
      const hasArduino = ARDUINO_FUNCTIONS.some((fn) => content.includes(fn.label));
      if (!hasArduino) return { suggestions: [] };

      const suggestions = arduinoCompletions.map((item) => ({
        ...item,
        range,
      }));

      return { suggestions };
    },
  });
}

// ─── Error markers parser ────────────────────────────────────────────────────

function parseArduinoErrors(code: string): { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number; message: string; severity: number }[] {
  const markers: any[] = [];
  const lines = code.split('\n');

  // Check for missing setup() and loop()
  const hasSetup = /void\s+setup\s*\(/.test(code);
  const hasLoop = /void\s+loop\s*\(/.test(code);

  if (!hasSetup) {
    markers.push({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 2,
      message: 'Missing void setup() — every Arduino sketch requires a setup() function',
      severity: 8, // MarkerSeverity.Error
    });
  }

  if (!hasLoop) {
    markers.push({
      startLineNumber: hasSetup ? 2 : 1,
      startColumn: 1,
      endLineNumber: hasSetup ? 2 : 1,
      endColumn: 2,
      message: 'Missing void loop() — every Arduino sketch requires a loop() function',
      severity: 8,
    });
  }

  // Check pinMode for invalid pins
  lines.forEach((line, idx) => {
    const pinModeMatch = line.match(/pinMode\s*\(\s*(\w+)\s*,/);
    if (pinModeMatch) {
      const pin = pinModeMatch[1];
      const pinNum = parseInt(pin, 10);
      const isAnalog = /^A[0-5]$/.test(pin);
      if (!isAnalog && isNaN(pinNum)) {
        if (!ARDUINO_CONSTANTS.some((c) => c.label === pin)) {
          markers.push({
            startLineNumber: idx + 1,
            startColumn: line.indexOf(pin) + 1,
            endLineNumber: idx + 1,
            endColumn: line.indexOf(pin) + pin.length + 1,
            message: `Invalid pin: "${pin}". Use a number (0-13) or analog pin (A0-A5)`,
            severity: 4, // MarkerSeverity.Warning
          });
        }
      } else if (!isAnalog && (pinNum < 0 || pinNum > 13)) {
        markers.push({
          startLineNumber: idx + 1,
          startColumn: line.indexOf(pin) + 1,
          endLineNumber: idx + 1,
          endColumn: line.indexOf(pin) + pin.length + 1,
          message: `Pin ${pin} out of range. Arduino Uno has digital pins 0-13 and analog pins A0-A5`,
          severity: 4,
        });
      }
    }
  });

  // Basic semicolon check — skip lines that should not have semicolons
  const noSemicolonPatterns = [
    /^\s*\/\//,          // comment
    /^\s*\/\*/,          // block comment start
    /^\s*\*/,            // block comment middle
    /^\s*#/,             // preprocessor
    /^\s*$/,             // empty
    /^\s*\{/,            // opening brace
    /^\s*\}/,            // closing brace
    /;\s*$/,             // already has semicolon
    /{\s*$/,             // ends with brace
    /^\s*void\s/,        // function definition
    /^\s*int\s/,         // function definition
    /^\s*long\s/,        // function definition
    /^\s*float\s/,       // function definition
    /^\s*const\s/,       // multi-line const
    /^\s*if\s*\(/,       // if statement body on next line
    /^\s*else\s*$/,      // else block
    /^\s*for\s*\(/,      // for loop
    /^\s*while\s*\(/,    // while loop
    /^\s*unsigned\s/,    // unsigned type
  ];

  lines.forEach((line, idx) => {
    const trimmed = line.trimEnd();
    if (!trimmed) return;
    if (noSemicolonPatterns.some((p) => p.test(trimmed))) return;

    // If the line has code but no semicolon and no brace at the end
    if (!trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.endsWith(',') && !trimmed.endsWith('\\')) {
      // Check if line actually has a statement-like structure
      const hasStatement = /[a-zA-Z]\w*\s*(\([^)]*\))?\s*([+\-*/%=&|!^<>,]|<<|>>)/.test(trimmed) ||
        /digitalWrite|digitalRead|analogWrite|analogRead|pinMode|delay|tone|noTone|Serial\.(begin|print|println)/.test(trimmed);
      if (hasStatement && trimmed.length > 2) {
        markers.push({
          startLineNumber: idx + 1,
          startColumn: 1,
          endLineNumber: idx + 1,
          endColumn: trimmed.length + 1,
          message: 'Possible missing semicolon at end of statement',
          severity: 2, // MarkerSeverity.Info (softer warning)
        });
      }
    }
  });

  return markers;
}

// ─── File type icon SVGs ─────────────────────────────────────────────────────

function FileIcon({ language }: { language: string }) {
  const lang = language || 'c';
  switch (lang) {
    case 'c':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="#0ea5e9" fillOpacity="0.15" stroke="#0ea5e9" strokeWidth="1" />
          <text x="8" y="11" textAnchor="middle" fill="#0ea5e9" fontSize="7" fontWeight="700" fontFamily="monospace">C</text>
        </svg>
      );
    case 'cpp':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="#8b5cf6" fillOpacity="0.15" stroke="#8b5cf6" strokeWidth="1" />
          <text x="8" y="11" textAnchor="middle" fill="#8b5cf6" fontSize="5.5" fontWeight="700" fontFamily="monospace">C++</text>
        </svg>
      );
    case 'python':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="#eab308" fillOpacity="0.15" stroke="#eab308" strokeWidth="1" />
          <text x="8" y="11" textAnchor="middle" fill="#eab308" fontSize="6" fontWeight="700" fontFamily="monospace">Py</text>
        </svg>
      );
    case 'json':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1" />
          <text x="8" y="11" textAnchor="middle" fill="#f59e0b" fontSize="5.5" fontWeight="700" fontFamily="monospace">{ }</text>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1" />
          <text x="8" y="11" textAnchor="middle" fill="#10b981" fontSize="5.5" fontWeight="700" fontFamily="monospace">TS</text>
        </svg>
      );
  }
}

// ─── Status bar item ─────────────────────────────────────────────────────────

function StatusItem({ children, onClick, title, className = '' }: { children: React.ReactNode; onClick?: () => void; title?: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-0.5 hover:bg-zinc-700/30 rounded-sm transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CodeEditor({ className = '' }: { className?: string }) {
  const { editorTabs, activeTabId, updateTabContent, setActiveTab, closeTab, simulation } =
    useSimulatorStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);

  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [charCount, setCharCount] = useState(0);
  const [wordWrap, setWordWrap] = useState(true);
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  const [languagesRegistered, setLanguagesRegistered] = useState(false);

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  // Register Arduino language and theme on first mount (once monaco is available)
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Eesha dark theme
    monaco.editor.defineTheme('eesha-dark', EESHA_DARK_THEME);
    monaco.editor.setTheme('eesha-dark');

    // Register Arduino language (only once)
    if (!languagesRegistered) {
      registerArduinoLanguage(monaco);
      setLanguagesRegistered(true);
    }

    editor.updateOptions({
      minimap: { enabled: minimapEnabled },
      fontSize: 13,
      lineHeight: 22,
      fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
      fontLigatures: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      links: false,
      contextmenu: true,
      tabSize: 2,
      wordWrap: wordWrap ? 'on' : 'off',
      automaticLayout: true,
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      parameterHints: { enabled: true },
    });

    // Cursor position tracking
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorLine(e.position.lineNumber);
      setCursorCol(e.position.column);
    });

    // Set initial character count
    const model = editor.getModel();
    if (model) {
      setCharCount(model.getValueLength());
    }
  }, [minimapEnabled, wordWrap, languagesRegistered]);

  // Update editor options when wordWrap or minimap changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        wordWrap: wordWrap ? 'on' : 'off',
        minimap: { enabled: minimapEnabled },
      });
    }
  }, [wordWrap, minimapEnabled]);

  // Update error markers when content changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeTab) {
      const monaco = monacoRef.current;
      const model = editorRef.current.getModel();
      if (!model) return;

      const lang = activeTab.language || 'c';
      const monacoLang = LANGUAGE_MAP[lang];

      if (monacoLang === 'arduino') {
        const markers = parseArduinoErrors(activeTab.content);
        monaco.editor.setModelMarkers(model, 'arduino-lint', markers);
      } else {
        monaco.editor.setModelMarkers(model, 'arduino-lint', []);
      }
    }
  }, [activeTab?.content, activeTab?.language]);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (activeTabId && value !== undefined) {
        updateTabContent(activeTabId, value);
        setCharCount(value.length);
      }
    },
    [activeTabId, updateTabContent]
  );

  // Breadcrumb path from tab name
  const breadcrumbParts = activeTab?.name
    ? activeTab.name.split('/').map((p, i, arr) => (
        <React.Fragment key={i}>
          <span className={i === arr.length - 1 ? 'text-zinc-300' : 'text-zinc-500'}>
            {p}
          </span>
          {i < arr.length - 1 && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-zinc-600 mx-0.5">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </React.Fragment>
      ))
    : null;

  const currentLanguage = activeTab ? (LANGUAGE_MAP[activeTab.language] || 'plaintext') : 'plaintext';
  const langLabel = LANGUAGE_LABELS[currentLanguage] || currentLanguage;

  return (
    <div className={`flex flex-col h-full bg-zinc-950 text-zinc-100 ${className}`}>
      {/* Tab bar */}
      <div className="flex items-center bg-zinc-900/80 border-b border-zinc-800 overflow-x-auto scrollbar-none">
        <div className="flex items-center min-w-0 flex-1">
          {editorTabs.map((tab) => {
            const lang = tab.language || 'c';
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={`group flex items-center gap-1.5 pl-2 pr-1 py-1.5 text-sm border-r border-zinc-800/50 cursor-pointer whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-zinc-950 text-zinc-100 border-t-2 border-t-emerald-500'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 border-t-2 border-t-transparent'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <FileIcon language={lang} />
                <span className="text-xs font-medium">{tab.name}</span>
                {tab.modified && (
                  <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                )}
                <button
                  className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all text-zinc-500 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb */}
      {activeTab && (
        <div className="flex items-center px-3 py-1 bg-zinc-900/40 border-b border-zinc-800/50 text-[11px]">
          <div className="flex items-center gap-0.5 min-w-0 overflow-hidden text-ellipsis">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-zinc-600 shrink-0 mr-1">
              <path d="M1.5 2L6.5 2L14.5 8L6.5 14H1.5V2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
            </svg>
            {breadcrumbParts}
          </div>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab ? (
          <MonacoEditor
            height="100%"
            language={LANGUAGE_MAP[activeTab.language] || 'c'}
            value={activeTab.content}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            theme="eesha-dark"
            options={{
              minimap: { enabled: minimapEnabled },
              fontSize: 13,
              lineHeight: 22,
            }}
            loading={
              <div className="flex items-center justify-center h-full bg-zinc-950">
                <div className="h-4 w-4 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm">No file open</p>
              <p className="text-xs text-zinc-700 mt-1">
                Select a template or create a new sketch
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-1 py-0 bg-zinc-900 border-t border-zinc-800 text-[11px] text-zinc-500 select-none shrink-0">
        {/* Left side */}
        <div className="flex items-center">
          <StatusItem className="!pl-1.5 text-emerald-400 font-medium gap-1">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="text-emerald-500">
              <circle cx="8" cy="8" r="4" />
            </svg>
            <span className="text-[10px]">Eesha Editor</span>
          </StatusItem>
          <div className="w-px h-3 bg-zinc-800 mx-0.5" />
          <StatusItem>
            <span className="text-zinc-400">{langLabel}</span>
          </StatusItem>
          {simulation?.isRunning ? (
            <>
              <div className="w-px h-3 bg-zinc-800 mx-0.5" />
              <StatusItem className="text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse inline-block mr-1" />
                Running
              </StatusItem>
            </>
          ) : null}
        </div>

        {/* Right side */}
        <div className="flex items-center">
          <StatusItem title="Line / Column">
            <span>
              Ln {cursorLine}, Col {cursorCol}
            </span>
          </StatusItem>
          <div className="w-px h-3 bg-zinc-800 mx-0.5" />
          <StatusItem title="Character count">
            {charCount} chars
          </StatusItem>
          <div className="w-px h-3 bg-zinc-800 mx-0.5" />
          <StatusItem>
            UTF-8
          </StatusItem>
          <div className="w-px h-3 bg-zinc-800 mx-0.5" />
          <StatusItem>
            LF
          </StatusItem>
          <div className="w-px h-3 bg-zinc-800 mx-0.5" />
          <StatusItem onClick={() => setMinimapEnabled(!minimapEnabled)} title={minimapEnabled ? 'Hide minimap' : 'Show minimap'}>
            <span className={`transition-colors ${minimapEnabled ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Minimap
            </span>
          </StatusItem>
          <div className="w-px h-3 bg-zinc-800 mx-0.5" />
          <StatusItem onClick={() => setWordWrap(!wordWrap)} title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="inline mr-0.5">
              {wordWrap ? (
                <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 5l2 3-2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
            </svg>
            <span className={`transition-colors ${wordWrap ? 'text-zinc-300' : 'text-zinc-600'}`}>
              {wordWrap ? 'Wrap' : 'No Wrap'}
            </span>
          </StatusItem>
          <div className="w-px h-3 bg-zinc-800 mx-0.5" />
          <StatusItem className="text-zinc-600">
            Spaces: 2
          </StatusItem>
        </div>
      </div>
    </div>
  );
}
