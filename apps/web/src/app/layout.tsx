import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '../components/providers/WalletProvider';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { TransactionToast } from '../components/ui/TransactionToast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Conwoy AI — 2-Player Competitive Conway\'s Game of Life',
  description: 'Deploy cellular automata patterns and battle for board dominance in this competitive on-chain game',
  keywords: ['Conway', 'Game of Life', 'competitive', 'blockchain', 'web3', 'strategy'],
  openGraph: {
    title: 'Conwoy AI',
    description: 'Competitive Conway\'s Game of Life with on-chain wagering',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans min-h-screen flex flex-col bg-background`}>
        <WalletProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <TransactionToast />
        </WalletProvider>
      </body>
    </html>
  );
}
