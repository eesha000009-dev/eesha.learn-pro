import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Eesha Learn — Premium Circuit Simulator',
  description:
    'Design, simulate, and learn electronics with Eesha Learn. Built with tscircuit, avr8js, and interactive visualization.',
  keywords: [
    'Eesha Learn',
    'circuit simulator',
    'Arduino',
    'electronics',
    'tscircuit',
    'avr8js',
    'breadboard',
    'schematic',
  ],
  authors: [{ name: 'Eesha Learn Team' }],
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚡</text></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        {children}
      </body>
    </html>
  );
}
