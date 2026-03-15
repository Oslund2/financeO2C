import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const MODES = ['light', 'dark', 'system'] as const;
const MODE_LABELS = { light: 'Light', dark: 'Dark', system: 'Auto' } as const;
const MODE_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const idx = MODES.indexOf(theme);
    setTheme(MODES[(idx + 1) % MODES.length]);
  };

  const Icon = MODE_ICONS[theme];

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm font-medium transition-all
        text-gray-600 hover:bg-blue-50
        dark:text-slate-400 dark:hover:bg-slate-700/50"
      title={`Theme: ${MODE_LABELS[theme]}`}
    >
      <div className="relative w-5 h-5">
        <Icon className="w-5 h-5 transition-transform duration-300" />
      </div>
      <span>{MODE_LABELS[theme]}</span>
    </button>
  );
}
