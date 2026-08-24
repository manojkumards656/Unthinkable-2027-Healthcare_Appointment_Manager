import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'ta', 'hi'],
  defaultLocale: 'en',
});

// Export typed navigation helpers
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
