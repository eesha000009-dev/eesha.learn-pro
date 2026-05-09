'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';

interface CodeEditorProps {
  className?: string;
}

export function CodeEditor({ className = '' }: CodeEditorProps) {
  const { editorTabs, activeTabId, updateTabContent, setActiveTab, closeTab, addTab } =
    useSimulatorStore();
  const [lineNumbers, setLineNumbers] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  const handleCodeChange = useCallback(
    (value: string) => {
      if (activeTabId) {
        updateTabContent(activeTabId, value);
      }
    },
    [activeTabId, updateTabContent]
  );

  const lines = activeTab?.content.split('\n') ?? [];

  return (
    <div className={`flex flex-col h-full bg-zinc-950 text-zinc-100 ${className}`}>
      {/* Tab bar */}
      <div className="flex items-center bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
        <div className="flex items-center min-w-0 flex-1">
          {editorTabs.map((tab) => (
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
                className={`h-2 w-2 rounded-full ${
                  tab.language === 'c' || tab.language === 'cpp'
                    ? 'bg-sky-400'
                    : tab.language === 'python'
                    ? 'bg-yellow-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-xs font-medium">{tab.name}</span>
              {tab.modified && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
              <button
                className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center px-2 gap-1">
          <button
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
            onClick={() => setLineNumbers(!lineNumbers)}
            title="Toggle line numbers"
          >
            #
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab ? (
          <div className="flex h-full">
            {/* Line numbers */}
            {lineNumbers && (
              <div className="select-none overflow-hidden bg-zinc-900 border-r border-zinc-800 px-3 py-3 text-right">
                {lines.map((_, i) => (
                  <div
                    key={i}
                    className="text-xs leading-[1.65rem] text-zinc-600 font-mono"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Code area */}
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent text-zinc-100 font-mono text-sm leading-[1.65rem] p-3 resize-none outline-none overflow-auto"
              value={activeTab.content}
              onChange={(e) => handleCodeChange(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
            />

            {/* Language indicator */}
            <div className="absolute bottom-2 right-3 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
                {activeTab.language}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <div className="text-center">
              <div className="text-4xl mb-3">📝</div>
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
          <span>{activeTab ? `${lines.length} lines` : 'No file'}</span>
          <span>{activeTab ? `${activeTab.content.length} chars` : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>
    </div>
  );
}
