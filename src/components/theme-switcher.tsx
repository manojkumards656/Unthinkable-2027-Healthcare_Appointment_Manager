'use client';

import { useTheme, Theme } from './theme-provider';
import { Sun, Moon, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('Theme');

  const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: t('lightMode'), icon: Sun },
    { id: 'oled', label: t('darkMode'), icon: Moon },
    { id: 'senior', label: t('seniorMode'), icon: Eye },
  ];

  return (
    <div 
      className="inline-flex p-1 rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs"
      role="group" 
      aria-label="Theme selection"
    >
      {themes.map(({ id, label, icon: Icon }) => {
        const isActive = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-[hsl(var(--primary-action))] text-white shadow-xs'
                : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--border-color))]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
