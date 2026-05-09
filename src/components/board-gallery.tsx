'use client';

import React, { useState, useMemo } from 'react';
import { useSimulatorStore } from '@/store/simulator-store';
import { registryBoards, boardTemplates, importSources, searchBoards, getBoardsByCategory } from '@/lib/board-registry';
import type { RegistryBoard } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Package,
  Download,
  Check,
  Cpu,
  Layers,
  Import,
  ArrowRight,
  Wifi,
  Shield,
  Monitor,
  CircuitBoard,
  Star,
  ChevronDown,
  ChevronRight,
  Cog,
  FileText,
  Database,
  Upload,
} from 'lucide-react';

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  microcontroller: { label: 'Microcontrollers', icon: <Cpu className="h-4 w-4" />, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  shield: { label: 'Shields & HATs', icon: <Shield className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  'sensor-module': { label: 'Sensors', icon: <Monitor className="h-4 w-4" />, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  'display-module': { label: 'Displays', icon: <Layers className="h-4 w-4" />, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  breakout: { label: 'Breakouts', icon: <CircuitBoard className="h-4 w-4" />, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  'dev-board': { label: 'Dev Boards', icon: <FileText className="h-4 w-4" />, color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
};

const archBadges: Record<string, { label: string; color: string }> = {
  avr: { label: 'AVR', color: 'bg-emerald-500/10 text-emerald-400' },
  'arm-cortex-m0': { label: 'ARM M0', color: 'bg-blue-500/10 text-blue-400' },
  'arm-cortex-m3': { label: 'ARM M3', color: 'bg-blue-500/10 text-blue-400' },
  'arm-cortex-m4': { label: 'ARM M4', color: 'bg-purple-500/10 text-purple-400' },
  xtensa: { label: 'Xtensa', color: 'bg-orange-500/10 text-orange-400' },
  'risc-v': { label: 'RISC-V', color: 'bg-yellow-500/10 text-yellow-400' },
};

const sourceIcons: Record<string, React.ReactNode> = {
  Package: <Package className="h-5 w-5" />,
  Database: <Database className="h-5 w-5" />,
  FileCode: <FileText className="h-5 w-5" />,
  Search: <Search className="h-5 w-5" />,
  Upload: <Upload className="h-5 w-5" />,
};

export function BoardGallery() {
  const { boardType, setBoardType, installedBoardIds, installBoard, uninstallBoard } = useSimulatorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedBoard, setExpandedBoard] = useState<string | null>(null);

  const filteredBoards = useMemo(() => {
    let boards = searchBoards(searchQuery);
    if (selectedCategory) boards = boards.filter((b) => b.category === selectedCategory);
    return boards;
  }, [searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const cats = [...new Set(registryBoards.map((b) => b.category))];
    return cats.map((c) => ({
      id: c,
      ...categoryConfig[c],
      count: registryBoards.filter((b) => b.category === c).length,
    }));
  }, []);

  const installedCount = registryBoards.filter((b) => b.installed).length;

  const handleToggleInstall = (board: RegistryBoard) => {
    if (board.installed) {
      uninstallBoard(board.id);
    } else {
      installBoard(board.id);
    }
  };

  const handleSelectBoard = (board: RegistryBoard) => {
    setBoardType(board.id as any);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
        >
          <CircuitBoard className="h-4 w-4" />
          <span>Boards</span>
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-400 border-0">
            {installedCount}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-zinc-900 border-zinc-800 text-zinc-100 overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CircuitBoard className="h-5 w-5 text-amber-400" />
            tscircuit Board Registry
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Browse, install, and manage boards from the tscircuit registry. Use <code className="text-amber-400 bg-zinc-800 px-1 rounded text-xs">tsci add</code> to install, or click the install button below.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="registry" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-zinc-800 w-fit">
            <TabsTrigger value="registry" className="text-xs gap-1">
              <Package className="h-3.5 w-3.5" />
              Registry
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1">
              <Layers className="h-3.5 w-3.5" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs gap-1">
              <Import className="h-3.5 w-3.5" />
              Import
            </TabsTrigger>
          </TabsList>

          {/* ===== REGISTRY TAB ===== */}
          <TabsContent value="registry" className="flex-1 min-h-0 flex flex-col gap-3 mt-3">
            {/* Search + Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search boards (name, MCU, architecture, tags)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors font-medium ${
                  !selectedCategory
                    ? 'bg-zinc-100 text-zinc-900 border-zinc-200'
                    : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                }`}
                onClick={() => setSelectedCategory(null)}
              >
                All ({registryBoards.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors flex items-center gap-1 ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-100 text-zinc-900 border-zinc-200'
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.icon}
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Board list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  isActive={boardType === board.id}
                  isExpanded={expandedBoard === board.id}
                  onToggleExpand={() =>
                    setExpandedBoard(expandedBoard === board.id ? null : board.id)
                  }
                  onToggleInstall={() => handleToggleInstall(board)}
                  onSelect={() => handleSelectBoard(board)}
                />
              ))}
              {filteredBoards.length === 0 && (
                <div className="text-center py-12 text-zinc-600">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No boards found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== TEMPLATES TAB ===== */}
          <TabsContent value="templates" className="flex-1 min-h-0 overflow-y-auto mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boardTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-blue-400" />
                    <h4 className="font-semibold text-sm text-zinc-200">{tmpl.name}</h4>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{tmpl.description}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex justify-between bg-zinc-800 px-2 py-1 rounded">
                      <span className="text-zinc-600">Dimensions</span>
                      <span className="text-zinc-400">{tmpl.baseWidth} x {tmpl.baseHeight}</span>
                    </div>
                    <div className="flex justify-between bg-zinc-800 px-2 py-1 rounded">
                      <span className="text-zinc-600">Mounting</span>
                      <span className={tmpl.defaultMountingHoles ? 'text-emerald-400' : 'text-zinc-600'}>
                        {tmpl.defaultMountingHoles ? 'Yes' : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ===== IMPORT TAB ===== */}
          <TabsContent value="import" className="flex-1 min-h-0 overflow-y-auto mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {importSources.map((source) => (
                <div
                  key={source.type}
                  className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-zinc-400">{sourceIcons[source.icon]}</div>
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-200">{source.name}</h4>
                      <p className="text-[10px] text-zinc-600">{source.formats.join(', ')}</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{source.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    <Import className="h-3 w-3 mr-1" />
                    Import from {source.name}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function BoardCard({
  board,
  isActive,
  isExpanded,
  onToggleExpand,
  onToggleInstall,
  onSelect,
}: {
  board: RegistryBoard;
  isActive: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleInstall: () => void;
  onSelect: () => void;
}) {
  const catConfig = categoryConfig[board.category];
  const archConfig = board.architecture ? archBadges[board.architecture] : null;

  return (
    <div
      className={`rounded-lg border transition-all ${
        isActive
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600'
      }`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Thumbnail */}
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: board.thumbnailColor + '20' }}
        >
          <Cpu className="h-5 w-5" style={{ color: board.thumbnailColor }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-zinc-200 truncate">{board.name}</h4>
            {isActive && (
              <Badge className="text-[8px] h-3.5 px-1 bg-emerald-500 text-white border-0">ACTIVE</Badge>
            )}
            {board.installed && !isActive && (
              <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-zinc-700 text-zinc-400 border-0">
                INSTALLED
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{board.description}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {archConfig && (
            <Badge variant="outline" className={`text-[8px] ${archConfig.color} border h-4 px-1`}>
              {archConfig.label}
            </Badge>
          )}
          {board.voltage && (
            <span className="text-[9px] text-zinc-600 font-mono">{board.voltage}V</span>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-zinc-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-zinc-800 pt-3 space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Digital', value: board.pinCount.digital },
              { label: 'Analog', value: board.pinCount.analog },
              { label: 'PWM', value: board.pinCount.pwm },
              { label: 'I2C', value: board.pinCount.i2c },
              { label: 'SPI', value: board.pinCount.spi },
            ].map((s) => (
              <div key={s.label} className="text-center bg-zinc-800 rounded p-1.5">
                <div className="text-sm font-bold text-zinc-300">{s.value}</div>
                <div className="text-[8px] text-zinc-600 uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          {/* MCU info */}
          <div className="flex items-center gap-3 text-[10px]">
            {board.mcu && (
              <span className="text-zinc-500">
                <span className="text-zinc-400 font-medium">MCU:</span> {board.mcu}
              </span>
            )}
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-500">
              <span className="text-zinc-400 font-medium">Size:</span> {board.dimensions.width} x {board.dimensions.height}
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-500">
              <span className="text-zinc-400 font-medium">License:</span>{' '}
              <span className="px-1 py-0 rounded bg-emerald-500/10 text-emerald-400 font-medium">{board.license}</span>
            </span>
          </div>

          {/* Emulator info */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-zinc-400 font-medium">Emulator:</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
              {(board as any).emulator || 'avr8js'}
            </span>
            <span className="text-zinc-600">Simulates {board.pinCount.digital} digital + {board.pinCount.analog} analog pins</span>
          </div>

          {/* tsci command */}
          <div className="bg-zinc-950 rounded p-2 flex items-center gap-2">
            <span className="text-[10px] text-amber-400 font-mono">{board.tsciCommand}</span>
            <button
              className="ml-auto text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(board.tsciCommand);
              }}
            >
              Copy
            </button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {board.tags.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[8px] bg-zinc-800 text-zinc-500 border-0 h-4">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 text-xs gap-1 ${
                isActive
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!board.installed) onToggleInstall();
                onSelect();
              }}
            >
              {isActive ? (
                <>
                  <Check className="h-3 w-3" />
                  Selected
                </>
              ) : (
                <>
                  <Cpu className="h-3 w-3" />
                  Use Board
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`text-xs gap-1 ${
                board.installed
                  ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                  : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleInstall();
              }}
            >
              {board.installed ? (
                <>
                  <Check className="h-3 w-3" />
                  Installed
                </>
              ) : (
                <>
                  <Download className="h-3 w-3" />
                  Install
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
