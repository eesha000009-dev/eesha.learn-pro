'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  Terminal,
  ArrowDown,
  Copy,
  Check,
  Hash,
  Clock,
  Send,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Circle,
} from 'lucide-react';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const;

function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
}

function classifyLine(text: string): 'error' | 'success' | 'warn' | 'normal' {
  const upper = text.toUpperCase();
  if (/\b(ERROR|FAIL|FATAL|PANIC|EXCEPTION)\b/.test(upper)) return 'error';
  if (/\b(OK|PASS|SUCCESS|DONE|READY|COMPLETE)\b/.test(upper)) return 'success';
  if (/\b(WARN|WARNING|CAUTION)\b/.test(upper)) return 'warn';
  return 'normal';
}

function getLineColor(type: 'error' | 'success' | 'warn' | 'normal'): string {
  switch (type) {
    case 'error': return 'text-amber-400';
    case 'success': return 'text-emerald-400';
    case 'warn': return 'text-yellow-300';
    default: return 'text-green-400';
  }
}

function getLogColor(level: string): string {
  switch (level) {
    case 'error': return 'text-amber-400';
    case 'warn': return 'text-yellow-300';
    case 'debug': return 'text-purple-400';
    default: return 'text-zinc-400';
  }
}

function getLogIcon(level: string, size = 12) {
  switch (level) {
    case 'error': return <AlertCircle className="shrink-0" style={{ width: size, height: size }} />;
    case 'warn': return <AlertTriangle className="shrink-0" style={{ width: size, height: size }} />;
    case 'debug': return <Bug className="shrink-0" style={{ width: size, height: size }} />;
    default: return <Info className="shrink-0" style={{ width: size, height: size }} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Serial Output Tab                                                  */
/* ------------------------------------------------------------------ */
function SerialTab({
  baudRate,
  showLineNumbers,
  showTimestamps,
  onToggleLineNumbers,
  onToggleTimestamps,
}: {
  baudRate: number;
  showLineNumbers: boolean;
  showTimestamps: boolean;
  onToggleLineNumbers: () => void;
  onToggleTimestamps: () => void;
}) {
  const { simulation, addSerialOutput } = useSimulatorStore();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sentMessages, setSentMessages] = useState<{ text: string; ts: string }[]>([]);

  const allLines = useMemo(() => {
    const systemStart: { type: 'system'; text: string; ts: string }[] = simulation.isRunning
      ? [{ type: 'system' as const, text: '--- Simulation started ---', ts: '' }]
      : simulation.serialOutput.length > 0
        ? [{ type: 'system' as const, text: '--- Simulation stopped ---', ts: '' }]
        : [];

    const serial = simulation.serialOutput.map((line) => ({
      type: 'serial' as const,
      text: line,
    }));

    const sent = sentMessages.map((m) => ({
      type: 'sent' as const,
      text: m.text,
      ts: m.ts,
    }));

    return [...systemStart, ...serial, ...sent];
  }, [simulation.serialOutput, simulation.isRunning, sentMessages]);

  const lineCount = simulation.serialOutput.length + sentMessages.length;

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [allLines, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (!atBottom && autoScroll) setAutoScroll(false);
    if (atBottom && !autoScroll) setAutoScroll(true);
  }, [autoScroll]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    addSerialOutput(trimmed);
    setSentMessages((prev) => [...prev, { text: trimmed, ts: getTimestamp() }]);
    setInput('');
    inputRef.current?.focus();
  }, [input, addSerialOutput]);

  const handleCopyAll = useCallback(() => {
    const text = simulation.serialOutput.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [simulation.serialOutput]);

  const handleClear = useCallback(() => {
    useSimulatorStore.getState().clearSerialOutput();
    setSentMessages([]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSend();
    },
    [handleSend],
  );

  const hasContent = allLines.length > 0;
  const showEmptyState = !simulation.isRunning && simulation.serialOutput.length === 0 && sentMessages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#0d0d0d] border-b border-zinc-800/50 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
          onClick={handleClear}
          title="Clear output (Ctrl+L)"
        >
          <Trash2 className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-1.5 ${autoScroll ? 'text-emerald-500' : 'text-zinc-600'} hover:text-zinc-300 hover:bg-zinc-800/60`}
          onClick={() => setAutoScroll(!autoScroll)}
          title="Auto-scroll"
        >
          <ArrowDown className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
          onClick={handleCopyAll}
          title="Copy all output"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </Button>

        <div className="h-3 w-px bg-zinc-800 mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-1.5 ${showLineNumbers ? 'text-emerald-500' : 'text-zinc-600'} hover:text-zinc-300 hover:bg-zinc-800/60`}
          onClick={onToggleLineNumbers}
          title="Toggle line numbers"
        >
          <Hash className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-1.5 ${showTimestamps ? 'text-emerald-500' : 'text-zinc-600'} hover:text-zinc-300 hover:bg-zinc-800/60`}
          onClick={onToggleTimestamps}
          title="Toggle timestamps"
        >
          <Clock className="w-3 h-3" />
        </Button>

        <div className="flex-1" />

        <span className="text-[10px] font-mono text-zinc-600 tabular-nums">{lineCount} lines</span>
        <span className="text-[10px] font-mono text-zinc-700 ml-2">{baudRate} baud</span>
      </div>

      {/* Output Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-[#0a0a0a] p-2 font-mono text-xs leading-relaxed"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#27272a transparent',
        }}
      >
        {/* Empty state */}
        {showEmptyState && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 select-none">
            <Terminal className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs text-zinc-500 mb-0.5">Waiting for serial data...</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="inline-block w-1.5 h-4 bg-emerald-500/60 animate-pulse rounded-sm" />
              <span className="text-[10px] text-zinc-700">idle</span>
            </div>
            <div className="mt-4 text-[10px] text-zinc-700 space-y-0.5 text-center">
              <p><kbd className="px-1 py-0.5 bg-zinc-800/60 rounded text-zinc-500 font-mono text-[9px]">Ctrl+L</kbd> clear output</p>
              <p><kbd className="px-1 py-0.5 bg-zinc-800/60 rounded text-zinc-500 font-mono text-[9px]">Enter</kbd> send input</p>
            </div>
          </div>
        )}

        {/* Lines */}
        {hasContent && allLines.map((entry, i) => {
          const lineNum = showLineNumbers ? (
            <span className="inline-block w-8 text-right mr-3 text-zinc-700 select-none tabular-nums text-[10px]">
              {String(i + 1).padStart(3, '\u2007')}
            </span>
          ) : null;

          if (entry.type === 'system') {
            return (
              <div key={`sys-${i}`} className="text-zinc-600 italic select-none">
                {lineNum}
                <span className="text-zinc-700 mr-1">{'---'}</span>
                {entry.text}
              </div>
            );
          }

          if (entry.type === 'sent') {
            return (
              <div key={`sent-${i}`} className="text-cyan-400">
                {lineNum}
                {showTimestamps && <span className="text-zinc-600 mr-2 text-[10px]">{entry.ts}</span>}
                <span className="text-cyan-600 mr-1">&gt;</span>
                {entry.text}
              </div>
            );
          }

          const cls = classifyLine(entry.text);
          return (
            <div key={`line-${i}`} className={getLineColor(cls)}>
              {lineNum}
              {showTimestamps && <span className="text-zinc-600 mr-2 text-[10px]">{getTimestamp()}</span>}
              {entry.text}
            </div>
          );
        })}

        {/* Active cursor when running */}
        {simulation.isRunning && (
          <div className="flex items-center text-emerald-500/50 mt-0.5 select-none">
            {showLineNumbers && <span className="inline-block w-8 text-right mr-3 text-zinc-700 text-[10px]">&nbsp;</span>}
            {showTimestamps && <span className="text-zinc-700 mr-2 text-[10px]">&nbsp;</span>}
            <span className="inline-block w-1.5 h-3.5 bg-emerald-500/70 animate-pulse rounded-sm" />
          </div>
        )}

        {/* Not at bottom indicator */}
        {!autoScroll && hasContent && (
          <div className="sticky bottom-2 flex justify-center">
            <button
              className="px-2 py-0.5 bg-zinc-800/90 text-zinc-400 text-[10px] rounded border border-zinc-700/50 hover:bg-zinc-700/90 transition-colors backdrop-blur-sm"
              onClick={() => {
                setAutoScroll(true);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
              }}
            >
              ↓ Jump to bottom
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[#0d0d0d] border-t border-zinc-800/50 flex-shrink-0">
        <span className="text-cyan-600 text-xs font-mono select-none">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={simulation.isRunning ? 'Send to serial port...' : 'Start simulation to send data'}
          disabled={!simulation.isRunning}
          className="flex-1 bg-transparent text-cyan-400 text-xs font-mono placeholder:text-zinc-700 outline-none disabled:opacity-30 disabled:cursor-not-allowed"
        />
        <Button
          size="sm"
          className="h-6 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-cyan-400 text-[10px] border border-zinc-700/50"
          onClick={handleSend}
          disabled={!simulation.isRunning || !input.trim()}
        >
          <Send className="w-3 h-3 mr-1" />
          Send
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Console Tab                                                        */
/* ------------------------------------------------------------------ */
function ConsoleTab() {
  const { logs, simulation, clearLogs, clearErrors } = useSimulatorStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  type ConsoleEntry =
    | { kind: 'system'; text: string }
    | { kind: 'log'; level: string; message: string; timestamp: number; source?: string };

  const allEntries = useMemo((): ConsoleEntry[] => {
    const sysStart: ConsoleEntry[] = simulation.isRunning
      ? [{ kind: 'system', text: '--- Simulation started ---' }]
      : simulation.serialOutput.length > 0 || logs.length > 0
        ? [{ kind: 'system', text: '--- Simulation stopped ---' }]
        : [];

    const errs: ConsoleEntry[] = simulation.errors.map((e) => ({
      kind: 'log',
      level: 'error',
      message: e,
      timestamp: Date.now(),
      source: 'simulation',
    }));

    const logEntries: ConsoleEntry[] = logs.map((l) => ({
      kind: 'log' as const,
      level: l.level,
      message: l.message,
      timestamp: l.timestamp,
      source: l.source,
    }));

    return [...sysStart, ...errs, ...logEntries];
  }, [logs, simulation.errors, simulation.isRunning, simulation.serialOutput.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allEntries]);

  const handleCopy = useCallback(() => {
    const text = allEntries
      .map((e) => {
        if (e.kind === 'system') return e.text;
        return `[${e.level.toUpperCase()}] ${e.message}`;
      })
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [allEntries]);

  const handleClear = useCallback(() => {
    clearLogs();
    clearErrors();
  }, [clearLogs, clearErrors]);

  return (
    <div className="flex flex-col h-full">
      {/* Console toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#0d0d0d] border-b border-zinc-800/50 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
          onClick={handleClear}
          title="Clear console"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
          onClick={handleCopy}
          title="Copy all"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </Button>
        <div className="flex-1" />
        <span className="text-[10px] font-mono text-zinc-600 tabular-nums">{allEntries.length} entries</span>
      </div>

      {/* Console output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-[#0a0a0a] p-2 font-mono text-xs leading-relaxed"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#27272a transparent',
        }}
      >
        {allEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 select-none">
            <Info className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs text-zinc-500">No console output yet</p>
            <p className="text-[10px] text-zinc-700 mt-1">Logs, warnings, and errors will appear here</p>
          </div>
        )}

        {allEntries.map((entry, i) => {
          if (entry.kind === 'system') {
            return (
              <div key={`sys-${i}`} className="text-zinc-600 italic select-none">
                <span className="text-zinc-700 mr-1">{'---'}</span>
                {entry.text}
              </div>
            );
          }

          const ts = entry.timestamp
            ? new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false }) +
              '.' +
              String(new Date(entry.timestamp).getMilliseconds()).padStart(3, '0')
            : '';

          return (
            <div key={`log-${i}`} className="flex items-start gap-1.5">
              {getLogIcon(entry.level)}
              <span className="text-zinc-600 text-[10px] tabular-nums shrink-0 mt-px">{ts}</span>
              <span className="text-zinc-700 text-[10px] tabular-nums shrink-0 mt-px">
                [{entry.level.toUpperCase().padEnd(5)}]
              </span>
              {entry.source && (
                <span className="text-zinc-600 text-[10px] shrink-0 mt-px">
                  {entry.source}:
                </span>
              )}
              <span className={getLogColor(entry.level)}>{entry.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Serial Monitor                                                */
/* ------------------------------------------------------------------ */
export function SerialMonitor() {
  const { simulation, showConsole } = useSimulatorStore();
  const [activeTab, setActiveTab] = useState('serial');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(false);

  /* Keyboard shortcut: Ctrl+L to clear */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (activeTab === 'serial') {
          useSimulatorStore.getState().clearSerialOutput();
        } else {
          useSimulatorStore.getState().clearLogs();
          useSimulatorStore.getState().clearErrors();
        }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab]);

  if (!showConsole) return null;

  const isConnected = simulation.isRunning;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-t border-zinc-800/70">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0d0d] border-b border-zinc-800/50 flex-shrink-0">
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isConnected
                ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]'
                : 'bg-red-500/70 shadow-[0_0_4px_rgba(239,68,68,0.3)]'
            }`}
          />
          <span className="text-[10px] font-mono text-zinc-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="text-[10px] font-mono text-zinc-700">at {baudRate} baud</span>
        </div>

        <div className="flex-1" />

        {/* Baud rate selector */}
        <select
          value={baudRate}
          onChange={(e) => setBaudRate(Number(e.target.value))}
          disabled={isConnected}
          className="h-5 px-1 text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800 rounded outline-none focus:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {BAUD_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate}
            </option>
          ))}
        </select>

        {/* Line numbers toggle */}
        <button
          className={`p-0.5 rounded transition-colors ${showLineNumbers ? 'text-emerald-500' : 'text-zinc-700'} hover:text-zinc-400`}
          onClick={() => setShowLineNumbers(!showLineNumbers)}
          title="Toggle line numbers"
        >
          <Hash className="w-3 h-3" />
        </button>

        {/* Timestamps toggle */}
        <button
          className={`p-0.5 rounded transition-colors ${showTimestamps ? 'text-emerald-500' : 'text-zinc-700'} hover:text-zinc-400`}
          onClick={() => setShowTimestamps(!showTimestamps)}
          title="Toggle timestamps"
        >
          <Clock className="w-3 h-3" />
        </button>
      </div>

      {/* Tab system */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList variant="line" className="w-full justify-start bg-[#0d0d0d] border-b border-zinc-800/30 px-2 h-7 flex-shrink-0 rounded-none">
          <TabsTrigger
            value="serial"
            className="h-6 text-[10px] font-medium gap-1 px-2 rounded-none data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:shadow-none data-[state=active]:bg-transparent text-zinc-600 hover:text-zinc-400"
          >
            <Terminal className="w-3 h-3" />
            Serial Monitor
          </TabsTrigger>
          <TabsTrigger
            value="console"
            className="h-6 text-[10px] font-medium gap-1 px-2 rounded-none data-[state=active]:text-zinc-300 data-[state=active]:border-b-2 data-[state=active]:border-zinc-500 data-[state=active]:shadow-none data-[state=active]:bg-transparent text-zinc-600 hover:text-zinc-400"
          >
            <Circle className="w-2.5 h-2.5" />
            Console
            {simulation.errors.length > 0 && (
              <span className="ml-0.5 px-1 py-0 text-[9px] bg-amber-500/20 text-amber-400 rounded-full leading-none">
                {simulation.errors.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="serial" className="flex-1 min-h-0 mt-0">
          <SerialTab
            baudRate={baudRate}
            showLineNumbers={showLineNumbers}
            showTimestamps={showTimestamps}
            onToggleLineNumbers={() => setShowLineNumbers(!showLineNumbers)}
            onToggleTimestamps={() => setShowTimestamps(!showTimestamps)}
          />
        </TabsContent>

        <TabsContent value="console" className="flex-1 min-h-0 mt-0">
          <ConsoleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
