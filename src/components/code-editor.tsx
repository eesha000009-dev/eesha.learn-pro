'use client';

import React, { useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSimulatorStore } from '@/store/simulator-store';

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

const LANGUAGE_MAP: Record<string, string> = {
  c: 'c',
  cpp: 'cpp',
  python: 'python',
  circuit: 'typescript',
  kicad: 'plaintext',
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

export function CodeEditor({ className = '' }: { className?: string }) {
  const { editorTabs, activeTabId, updateTabContent, setActiveTab, closeTab, simulation } =
    useSimulatorStore();
  const editorRef = useRef<any>(null);

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  const handleEditorDidMount = useCallback((editor: any) => {
    editorRef.current = editor;
    editor.updateOptions({
      minimap: { enabled: false },
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
      glyphMargin: false,
      folding: true,
      links: false,
      contextmenu: true,
      tabSize: 2,
      wordWrap: 'on',
      automaticLayout: true,
    });
  }, []);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (activeTabId && value !== undefined) {
        updateTabContent(activeTabId, value);
      }
    },
    [activeTabId, updateTabContent]
  );

  return (
    <div className={`flex flex-col h-full bg-zinc-950 text-zinc-100 ${className}`}>
      {/* Tab bar */}
      <div className="flex items-center bg-zinc-900 border-b border-zinc-800 overflow-x-auto scrollbar-none">
        <div className="flex items-center min-w-0 flex-1">
          {editorTabs.map((tab) => {
            const lang = tab.language || 'c';
            return (
              <div
                key={tab.id}
                className={`group flex items-center gap-2 px-3 py-2 text-sm border-r border-zinc-800 cursor-pointer whitespace-nowrap transition-colors ${
                  tab.id === activeTabId
                    ? 'bg-zinc-950 text-zinc-100 border-t-2 border-t-emerald-500'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    lang === 'c' || lang === 'cpp'
                      ? 'bg-sky-500/10 text-sky-400'
                      : lang === 'python'
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : lang === 'json'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {LANGUAGE_ICONS[lang] || lang.toUpperCase()}
                </span>
                <span className="text-xs font-medium">{tab.name}</span>
                {tab.modified && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
                <button
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity text-zinc-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab ? (
          <MonacoEditor
            height="100%"
            language={LANGUAGE_MAP[activeTab.language] || 'c'}
            value={activeTab.content}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
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
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ready
          </span>
          <span>Ln {activeTab ? activeTab.content.split('\n').length : 0}, Col 1</span>
          <span>{activeTab ? `${activeTab.content.length} chars` : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span className="text-zinc-600">
            Monaco Editor
          </span>
        </div>
      </div>
    </div>
  );
}
