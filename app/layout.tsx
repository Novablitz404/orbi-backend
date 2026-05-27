import type { Metadata } from 'next';
import { Inter, Fredoka } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Orbi — The Smartest Wallet on Stellar',
  description:
    'Passkey-secured, self-custodial smart wallet built on Soroban. Send USDC anywhere in seconds. No seed phrases. No complexity.',
  keywords: ['Stellar', 'USDC', 'crypto wallet', 'passkey', 'Soroban', 'smart wallet'],
  openGraph: {
    title: 'Orbi — The Smartest Wallet on Stellar',
    description: 'Send USDC anywhere in seconds. Passkey-secured. No seed phrases.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fredoka.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
