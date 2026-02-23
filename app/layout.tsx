import type { Metadata } from 'next';
import { Bebas_Neue, Manrope } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';

import '@/app/globals.css';
import { AppShell } from '@/components/app-shell';

const bodyFont = Manrope({ subsets: ['latin'], variable: '--font-body' });
const titleFont = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-title' });

export const metadata: Metadata = {
  title: 'PRODE Mundial 2026',
  description: 'Predicciones del mundial con registro, resultados y tabla de posiciones',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var saved = localStorage.getItem('prode-theme');
                var theme = (saved === 'dark' || saved === 'light')
                  ? saved
                  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.dataset.theme = theme;
              } catch (e) {}
            })();
          `}
        </Script>
      </head>
      <body className={`${bodyFont.className} ${bodyFont.variable} ${titleFont.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
