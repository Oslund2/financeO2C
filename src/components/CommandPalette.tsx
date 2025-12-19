import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Clapperboard,
  Users,
  Sparkles,
  FileText,
  Camera,
  Image,
  Film,
  PlayCircle,
  TrendingUp,
  Settings,
  Plus,
  Command,
  ArrowRight,
  X,
  Keyboard,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  category: 'navigation' | 'action' | 'recent';
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  seriesId: string | null;
}

export function CommandPalette({ isOpen, onClose, onNavigate, seriesId }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      description: 'View overview and stats',
      icon: Clapperboard,
      category: 'navigation',
      shortcut: 'G D',
      action: () => { onNavigate('dashboard'); onClose(); },
    },
    {
      id: 'characters',
      label: 'Go to Characters',
      description: 'Manage your character cast',
      icon: Users,
      category: 'navigation',
      shortcut: 'G C',
      action: () => { onNavigate('characters'); onClose(); },
    },
    {
      id: 'ai-studio',
      label: 'Go to AI Studio',
      description: 'Generate content with AI',
      icon: Sparkles,
      category: 'navigation',
      shortcut: 'G A',
      action: () => { onNavigate('ai-studio'); onClose(); },
    },
    {
      id: 'scripts',
      label: 'Go to Scripts',
      description: 'View and manage scripts',
      icon: FileText,
      category: 'navigation',
      shortcut: 'G S',
      action: () => { onNavigate('scripts'); onClose(); },
    },
    {
      id: 'storyboards',
      label: 'Go to Storyboards',
      description: 'Create visual storyboards',
      icon: Camera,
      category: 'navigation',
      shortcut: 'G B',
      action: () => { onNavigate('storyboard-generator'); onClose(); },
    },
    {
      id: 'assets',
      label: 'Go to Asset Library',
      description: 'Browse production assets',
      icon: Image,
      category: 'navigation',
      shortcut: 'G L',
      action: () => { onNavigate('assets'); onClose(); },
    },
    {
      id: 'episodes',
      label: 'Go to Episodes',
      description: 'Track episode production',
      icon: Film,
      category: 'navigation',
      shortcut: 'G E',
      action: () => { onNavigate('episodes'); onClose(); },
    },
    {
      id: 'production',
      label: 'Go to Production',
      description: 'Monitor production workflow',
      icon: PlayCircle,
      category: 'navigation',
      shortcut: 'G P',
      action: () => { onNavigate('production'); onClose(); },
    },
    {
      id: 'profit',
      label: 'Go to Production Economics',
      description: 'View production costs, revenue, and break-even analysis',
      icon: TrendingUp,
      category: 'navigation',
      action: () => { onNavigate('profit-per-episode'); onClose(); },
    },
    {
      id: 'settings',
      label: 'Go to Settings',
      description: 'Configure application',
      icon: Settings,
      category: 'navigation',
      shortcut: 'G ,',
      action: () => { onNavigate('settings'); onClose(); },
    },
    {
      id: 'new-character',
      label: 'Create New Character',
      description: 'Add a character to your cast',
      icon: Plus,
      category: 'action',
      action: () => { onNavigate('characters'); onClose(); },
    },
    {
      id: 'new-script',
      label: 'Generate New Script',
      description: 'Create a script with AI',
      icon: Plus,
      category: 'action',
      action: () => { onNavigate('ai-studio'); onClose(); },
    },
    {
      id: 'new-storyboard',
      label: 'Create Storyboard',
      description: 'Generate visual storyboard',
      icon: Plus,
      category: 'action',
      action: () => { onNavigate('storyboard-generator'); onClose(); },
    },
  ];

  const filteredCommands = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const groupedCommands = {
    navigation: filteredCommands.filter((c) => c.category === 'navigation'),
    action: filteredCommands.filter((c) => c.category === 'action'),
  };

  const flatFilteredCommands = [...groupedCommands.navigation, ...groupedCommands.action];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatFilteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatFilteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (flatFilteredCommands[selectedIndex]) {
            flatFilteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, flatFilteredCommands, selectedIndex, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for pages, actions, or shortcuts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 text-lg"
            />
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 font-medium">
              <span>ESC</span>
            </div>
          </div>

          <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
            {flatFilteredCommands.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              <>
                {groupedCommands.navigation.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Navigation
                    </div>
                    {groupedCommands.navigation.map((cmd, index) => {
                      const Icon = cmd.icon;
                      const globalIndex = index;
                      return (
                        <button
                          key={cmd.id}
                          data-index={globalIndex}
                          onClick={cmd.action}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            selectedIndex === globalIndex
                              ? 'bg-scripps-blue text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            selectedIndex === globalIndex
                              ? 'bg-white/20'
                              : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              selectedIndex === globalIndex
                                ? 'text-white'
                                : 'text-scripps-blue'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{cmd.label}</div>
                            {cmd.description && (
                              <div className={`text-sm ${
                                selectedIndex === globalIndex
                                  ? 'text-white/70'
                                  : 'text-gray-500'
                              }`}>
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          {cmd.shortcut && (
                            <div className={`flex items-center gap-1 text-xs font-medium ${
                              selectedIndex === globalIndex
                                ? 'text-white/70'
                                : 'text-gray-400'
                            }`}>
                              {cmd.shortcut.split(' ').map((key, i) => (
                                <span
                                  key={i}
                                  className={`px-1.5 py-0.5 rounded ${
                                    selectedIndex === globalIndex
                                      ? 'bg-white/20'
                                      : 'bg-gray-100'
                                  }`}
                                >
                                  {key}
                                </span>
                              ))}
                            </div>
                          )}
                          <ArrowRight className={`w-4 h-4 ${
                            selectedIndex === globalIndex
                              ? 'text-white/70'
                              : 'text-gray-400'
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                )}

                {groupedCommands.action.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Quick Actions
                    </div>
                    {groupedCommands.action.map((cmd, index) => {
                      const Icon = cmd.icon;
                      const globalIndex = groupedCommands.navigation.length + index;
                      return (
                        <button
                          key={cmd.id}
                          data-index={globalIndex}
                          onClick={cmd.action}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            selectedIndex === globalIndex
                              ? 'bg-scripps-blue text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            selectedIndex === globalIndex
                              ? 'bg-white/20'
                              : 'bg-green-100'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              selectedIndex === globalIndex
                                ? 'text-white'
                                : 'text-green-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{cmd.label}</div>
                            {cmd.description && (
                              <div className={`text-sm ${
                                selectedIndex === globalIndex
                                  ? 'text-white/70'
                                  : 'text-gray-500'
                              }`}>
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          <ArrowRight className={`w-4 h-4 ${
                            selectedIndex === globalIndex
                              ? 'text-white/70'
                              : 'text-gray-400'
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Keyboard className="w-3.5 h-3.5" />
                <span className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">↑</span>
                <span className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">↓</span>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">Enter</span>
                to select
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Command className="w-3.5 h-3.5" />
              <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">K</span>
              to open anytime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
