'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Language');

  const languages = [
    { code: 'en', label: t('english') },
    { code: 'ta', label: t('tamil') },
    { code: 'hi', label: t('hindi') },
  ];

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-color))] shadow-xs text-xs font-medium">
      <Languages className="w-4 h-4 text-[hsl(var(--text-muted))] shrink-0" />
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value)}
        aria-label="Select Language"
        className="bg-transparent text-[hsl(var(--text-primary))] outline-none font-medium cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-[hsl(var(--surface-card))] text-[hsl(var(--text-primary))]">
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
