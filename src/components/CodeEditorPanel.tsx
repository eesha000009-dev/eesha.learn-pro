'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSimulatorStore } from '@/store/simulator-store';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-white">
      <div className="flex items-center gap-2 text-gray-400">
        <div className="h-4 w-4 border-2 border-gray-200 border-t-[#4361EE] rounded-full animate-spin" />
        <span className="text-xs">Loading editor...</span>
      </div>
    </div>
  ),
});

// ─── Arduino Light Theme ───────────────────────────────────────────────────

const ARDUINO_LIGHT_THEME: { base: string; inherit: boolean; rules: any[]; colors: Record<string, string> } = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword.arduino', foreground: '#4361EE', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: '#4361EE' },
    { token: 'keyword', foreground: '#4361EE' },
    { token: 'string', foreground: '#c7254e' },
    { token: 'string.escape', foreground: '#a41e22' },
    { token: 'number', foreground: '#098658' },
    { token: 'comment', foreground: '#6a9955', fontStyle: 'italic' },
    { token: 'type', foreground: '#8b5cf6' },
    { token: 'entity.name.function', foreground: '#267f99' },
    { token: 'delimiter', foreground: '#868686' },
    { token: 'keyword.preprocessor', foreground: '#c7254e' },
    { token: 'constant', foreground: '#098658' },
    { token: 'variable', foreground: '#1e1e1e' },
    { token: 'operator', foreground: '#868686' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#1e1e1e',
    'editor.lineHighlightBackground': '#f5f5f5',
    'editor.selectionBackground': '#4361EE33',
    'editorCursor.foreground': '#4361EE',
    'editorWhitespace.foreground': '#e0e0e0',
    'editorIndentGuide.background': '#efefef',
    'editorIndentGuide.activeBackground': '#4361EE30',
    'editorLineNumber.foreground': '#b0b0b0',
    'editorLineNumber.activeForeground': '#1e1e1e',
    'editorBracketMatch.background': '#4361EE15',
    'editorBracketMatch.border': '#4361EE50',
    'editorGutter.background': '#ffffff',
    'editorWidget.background': '#f8f8f8',
    'editorWidget.border': '#e0e0e0',
    'editorSuggestWidget.background': '#f8f8f8',
    'editorSuggestWidget.border': '#e0e0e0',
    'editorSuggestWidget.selectedBackground': '#e8e8e8',
    'editorSuggestWidget.highlightForeground': '#4361EE',
    'scrollbarSlider.background': '#c0c0c080',
    'scrollbarSlider.hoverBackground': '#c0c0c0a0',
    'minimap.background': '#ffffff',
    'editorError.foreground': '#ef4444',
    'editorWarning.foreground': '#f59e0b',
  },
};

// ─── Arduino language registration ─────────────────────────────────────────

function registerArduinoLanguage(monaco: any) {
  monaco.languages.register({ id: 'arduino', extensions: ['.ino', '.pde'], aliases: ['Arduino'] });
  monaco.languages.setMonarchTokensProvider('arduino', {
    keywords: ['break', 'case', 'continue', 'default', 'do', 'else', 'for', 'if', 'return', 'switch', 'this', 'while', 'void', 'new', 'delete', 'true', 'false', 'null'],
    arduinoFunctions: ['pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'millis', 'tone', 'noTone', 'map', 'constrain', 'sizeof', 'abs'],
    arduinoObjects: ['Serial', 'Wire', 'SPI', 'LiquidCrystal', 'Servo', 'DHT'],
    typeKeywords: ['int', 'long', 'float', 'double', 'char', 'byte', 'boolean', 'unsigned', 'signed', 'const', 'static', 'volatile', 'extern', 'struct', 'enum', 'class', 'String', 'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t'],
    operators: ['=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--', '+', '-', '*', '/', '%', '<<', '>>'],
    symbols: /[=><!~?:&|+\-*/^%]+/,
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
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
      ],
      afterIdentifier: [
        [/[a-zA-Z_]\w*/, { cases: { '@typeKeywords': 'type', '@keywords': 'keyword', '@default': 'identifier' } }],
        [/[ \t\r\n]+/, { token: '', next: '@pop' }],
        [/@symbols/, { cases: { '@operators': { token: 'operator', next: '@pop' }, '@default': { token: '', next: '@pop' } } }],
        ['', '', '@pop'],
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
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

  monaco.languages.setLanguageConfiguration('arduino', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] }, { open: "'", close: "'", notIn: ['string', 'comment'] },
    ],
    folding: true,
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  });

  // Completions
  const arduinoItems: any[] = [
    { label: 'setup', kind: 3, detail: 'void setup()', insertText: 'void setup() {\n\t$0\n}', insertTextRules: 4 },
    { label: 'loop', kind: 3, detail: 'void loop()', insertText: 'void loop() {\n\t$0\n}', insertTextRules: 4 },
    { label: 'pinMode', kind: 3, detail: 'void pinMode(pin, mode)', insertText: 'pinMode(${1:pin}, ${2:OUTPUT});', insertTextRules: 4 },
    { label: 'digitalWrite', kind: 3, detail: 'void digitalWrite(pin, val)', insertText: 'digitalWrite(${1:pin}, ${2:HIGH});', insertTextRules: 4 },
    { label: 'digitalRead', kind: 3, detail: 'int digitalRead(pin)', insertText: 'digitalRead(${1:pin})', insertTextRules: 4 },
    { label: 'analogWrite', kind: 3, detail: 'void analogWrite(pin, val)', insertText: 'analogWrite(${1:pin}, ${2:0});', insertTextRules: 4 },
    { label: 'analogRead', kind: 3, detail: 'int analogRead(pin)', insertText: 'analogRead(${1:A0})', insertTextRules: 4 },
    { label: 'delay', kind: 3, detail: 'void delay(ms)', insertText: 'delay(${1:1000});', insertTextRules: 4 },
    { label: 'millis', kind: 3, detail: 'unsigned long millis()', insertText: 'millis()', insertTextRules: 4 },
    { label: 'tone', kind: 3, detail: 'void tone(pin, freq, dur)', insertText: 'tone(${1:8}, ${2:440}${3:, ${4:500}});', insertTextRules: 4 },
    { label: 'noTone', kind: 3, detail: 'void noTone(pin)', insertText: 'noTone(${1:8});', insertTextRules: 4 },
    { label: 'map', kind: 3, detail: 'long map(val, inLo, inHi, outLo, outHi)', insertText: 'map(${1:val}, ${2:0}, ${3:1023}, ${4:0}, ${5:255})', insertTextRules: 4 },
    { label: 'HIGH', kind: 14, detail: '1', insertText: 'HIGH' },
    { label: 'LOW', kind: 14, detail: '0', insertText: 'LOW' },
    { label: 'INPUT', kind: 14, detail: '0', insertText: 'INPUT' },
    { label: 'OUTPUT', kind: 14, detail: '1', insertText: 'OUTPUT' },
    { label: 'INPUT_PULLUP', kind: 14, detail: '2', insertText: 'INPUT_PULLUP' },
    { label: 'LED_BUILTIN', kind: 14, detail: '13', insertText: 'LED_BUILTIN' },
    { label: 'Serial.begin', kind: 3, detail: 'void Serial.begin(baud)', insertText: 'Serial.begin(${1:9600});', insertTextRules: 4 },
    { label: 'Serial.println', kind: 3, detail: 'void Serial.println()', insertText: 'Serial.println(${1:""});', insertTextRules: 4 },
    { label: 'Serial.print', kind: 3, detail: 'void Serial.print()', insertText: 'Serial.print(${1:""});', insertTextRules: 4 },
    { label: 'Serial.available', kind: 3, detail: 'int Serial.available()', insertText: 'Serial.available()', insertTextRules: 4 },
    { label: 'Serial.read', kind: 3, detail: 'int Serial.read()', insertText: 'Serial.read()', insertTextRules: 4 },
    { label: 'blink-led', kind: 9, detail: 'LED Blink Sketch', insertText: 'void setup() {\n\tpinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n\tdigitalWrite(LED_BUILTIN, HIGH);\n\tdelay(1000);\n\tdigitalWrite(LED_BUILTIN, LOW);\n\tdelay(1000);\n}', insertTextRules: 4 },
  ];

  for (let i = 0; i <= 13; i++) {
    arduinoItems.push({ label: String(i), kind: 12, detail: `D${i}`, insertText: String(i) });
  }
  for (let i = 0; i <= 5; i++) {
    arduinoItems.push({ label: `A${i}`, kind: 12, detail: `Analog A${i}`, insertText: `A${i}` });
  }

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
      const lineContent = model.getLineContent(position.lineNumber);
      const textBefore = lineContent.substring(0, position.column - 1);
      if (textBefore.endsWith('Serial.')) {
        const serialMethods = [
          { label: 'begin', kind: 3, detail: 'void begin(baud)', insertText: 'begin(${1:9600});', insertTextRules: 4 },
          { label: 'println', kind: 3, detail: 'void println()', insertText: 'println(${1:""});', insertTextRules: 4 },
          { label: 'print', kind: 3, detail: 'void print()', insertText: 'print(${1:""});', insertTextRules: 4 },
          { label: 'available', kind: 3, insertText: 'available()', insertTextRules: 4 },
          { label: 'read', kind: 3, insertText: 'read()', insertTextRules: 4 },
          { label: 'readString', kind: 3, insertText: 'readString()', insertTextRules: 4 },
        ];
        return { suggestions: serialMethods };
      }
      return { suggestions: arduinoItems.map((item) => ({ ...item, range })) };
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────────

export function CodeEditorPanel() {
  const { editorTabs, activeEditorTabId, updateEditorTabContent, setActiveEditorTab, closeEditorTab } =
    useSimulatorStore();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [langsRegistered, setLangsRegistered] = useState(false);

  const activeTab = editorTabs.find((t) => t.id === activeEditorTabId);

  const handleMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.defineTheme('arduino-light', ARDUINO_LIGHT_THEME);
    monaco.editor.setTheme('arduino-light');
    if (!langsRegistered) {
      registerArduinoLanguage(monaco);
      setLangsRegistered(true);
    }
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 22,
      fontFamily: "'Geist Mono', 'Fira Code', monospace",
      fontLigatures: true,
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      renderLineHighlight: 'all',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
      tabSize: 2,
      wordWrap: 'on',
      automaticLayout: true,
      minimap: { enabled: false },
      suggest: { showKeywords: true, showSnippets: true },
    });
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorLine(e.position.lineNumber);
      setCursorCol(e.position.column);
    });
  }, [langsRegistered]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeEditorTabId && value !== undefined) {
        updateEditorTabContent(activeEditorTabId, value);
      }
    },
    [activeEditorTabId, updateEditorTabContent]
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab bar */}
      <div className="flex items-center bg-[#F8F9FA] border-b border-[#E9ECEF] min-h-[36px]">
        {editorTabs.map((tab) => {
          const isActive = tab.id === activeEditorTabId;
          return (
            <div
              key={tab.id}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-[#E9ECEF] cursor-pointer transition-all ${
                isActive
                  ? 'bg-white text-gray-800 border-t-2 border-t-[#4361EE]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-t-2 border-t-transparent'
              }`}
              onClick={() => setActiveEditorTab(tab.id)}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <rect x="1" y="1" width="14" height="14" rx="2" fill="#4361EE" fillOpacity="0.1" stroke="#4361EE" strokeWidth="1" />
                <text x="8" y="11" textAnchor="middle" fill="#4361EE" fontSize="6" fontWeight="700" fontFamily="monospace">C</text>
              </svg>
              <span>{tab.name}</span>
              {tab.modified && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
              <button
                className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all text-gray-400"
                onClick={(e) => { e.stopPropagation(); closeEditorTab(tab.id); }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab ? (
          <MonacoEditor
            height="100%"
            language="arduino"
            value={activeTab.content}
            onChange={handleChange}
            onMount={handleMount}
            theme="arduino-light"
            options={{ fontSize: 14, lineHeight: 22 }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-sm">No file open</p>
              <p className="text-xs text-gray-300 mt-1">Open the Code tab from above or create a new sketch</p>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#F8F9FA] border-t border-[#E9ECEF] text-[11px] text-gray-500 select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[#4361EE] font-medium">Arduino</span>
          <span className="text-gray-300">|</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Ln {cursorLine}, Col {cursorCol}</span>
          <span className="text-gray-300">|</span>
          <span>{activeTab?.content.length ?? 0} chars</span>
        </div>
      </div>
    </div>
  );
}
