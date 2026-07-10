import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Caveat } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-cursive',
});

export const metadata: Metadata = {
  title: 'LTC ROI Calculator - Long-Term Care Value Optimizer with Paycor',
  description: 'Calculate ROI, PBJ compliance impact, Value-Based Purchasing (VBP) star rating benefits, and turnover savings for your Long-Term Care facility.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${caveat.variable}`}>
      <body className="font-sans antialiased text-[#3B4446] bg-[#E5E6E4] min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
