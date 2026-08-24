import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Tamil } from 'next/font/google';

export const fontLatin = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const fontDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-hindi',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const fontTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  variable: '--font-tamil',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
