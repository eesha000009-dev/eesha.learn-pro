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
  title: 'Eesha Learn — Arduino Simulator',
  description:
    'Design, simulate, and learn electronics with Eesha Learn. Wokwi-like Arduino simulator with avr8js, realistic board visuals, and pin-to-pin wire connections.',
  keywords: [
    'Eesha Learn',
    'Arduino simulator',
    'Wokwi alternative',
    'circuit simulator',
    'Arduino',
    'electronics learning',
    'avr8js',
    'breadboard',
    'Monaco Editor',
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        {children}
      </body>
    </html>
  );
}
