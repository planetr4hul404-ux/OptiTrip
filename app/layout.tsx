import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OptiTrip — Multi-Criteria Urban Transit Optimizer',
  description:
    'Compare Pune transit options: Auto-rickshaw, PMPML Bus, Cab, and Walking with intelligent fare, time, and reliability scoring.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-[#FFFCE1] text-[#44362e] font-sans antialiased selection:bg-[#FFBE91] selection:text-[#44362e]">
        {children}
      </body>
    </html>
  );
}
