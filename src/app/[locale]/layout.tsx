import '@/app/globals.css';
import { fontLatin, fontDevanagari, fontTamil } from '@/lib/fonts';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AuthProvider } from '@/lib/firebase/auth-context';
import { ThemeProvider } from '@/components/theme-provider';

const allowedLocales = ['en', 'ta', 'hi'];

export default async function RootLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!allowedLocales.includes(locale)) notFound();

  const messages = await getMessages();

  const resolveActiveFontClass = () => {
    switch (locale) {
      case 'ta': return `${fontTamil.variable} font-tamil`;
      case 'hi': return `${fontDevanagari.variable} font-hindi`;
      default:   return `${fontLatin.variable} font-sans`;
    }
  };

  return (
    <html lang={locale} className={resolveActiveFontClass()} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const theme = localStorage.getItem('theme') || 'light';
              document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {}
          })();
        `}} />
      </head>
      <body className="min-h-screen bg-[hsl(var(--bg-root))] text-[hsl(var(--text-primary))] antialiased transition-colors duration-200 flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              {children}
            </NextIntlClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
