import type {Metadata} from 'next';
import { Manrope, Inter } from 'next/font/google';
import './globals.css'; // Global styles

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Maria Bonita Açaíteria',
  description: 'Controle de Estoque Inteligente',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${manrope.variable} ${inter.variable}`}>
      <body suppressHydrationWarning className="font-body bg-background text-on-surface">{children}</body>
    </html>
  );
}
