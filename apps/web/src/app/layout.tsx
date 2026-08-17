import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata = {
  title: 'Apex Kepler Exchange | Professional Hybrid Crypto Exchange Simulation',
  description: 'High-performance Centralized Crypto Exchange simulation with matching engine, orderbook depth, synthetic liquidity, double-entry ledger, P2P marketplace, and proof of reserves.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#12161c] text-[#eaecef] min-h-screen flex flex-col antialiased font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
