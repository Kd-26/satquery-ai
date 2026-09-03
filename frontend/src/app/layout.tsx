import { Providers } from "./providers";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "SatQuery AI // Neuro-Symbolic Geospatial Intelligence",
  description: "Deterministic satellite observation verification engine. Combining vision-language planning with PostGIS spatial proofs, spectral band algebra, and zero-hallucination guarantees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-primary text-text-primary font-sans`}
      >
        <Providers>
          {/* Top Mission Control Bar */}
          <header className="sticky top-0 z-50 bg-panel/95 backdrop-blur border-b border-subtle">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              {/* Brand / Logo */}
              <div className="flex items-center gap-3">
                <a href="/" className="flex items-center gap-2.5 group">
                  <div className="w-7 h-7 rounded border border-accent/40 bg-accent/10 flex items-center justify-center text-accent transition-all group-hover:border-accent group-hover:bg-accent/20">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
                      <path d="M12 3a9 9 0 0 1 9 9" />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm tracking-wider font-mono text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                      SATQUERY<span className="text-accent">.AI</span>
                      <span className="text-[10px] px-1 py-0.2 bg-subtle text-text-secondary border border-subtle font-mono">v1.0</span>
                    </span>
                    <span className="text-[9px] text-text-secondary font-mono tracking-widest uppercase hidden sm:inline">
                      NEURO-SYMBOLIC EO ENGINE
                    </span>
                  </div>
                </a>
              </div>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
                <a 
                  href="/" 
                  className="px-3 py-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-subtle transition-colors"
                >
                  <span className="text-accent mr-1 font-bold">00</span>MISSION OVERVIEW
                </a>
                <a 
                  href="/query" 
                  className="px-3 py-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-subtle transition-colors"
                >
                  <span className="text-accent mr-1 font-bold">01</span>QUICK QUERY
                </a>
                <a 
                  href="/benchmark" 
                  className="px-3 py-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-subtle transition-colors"
                >
                  <span className="text-accent mr-1 font-bold">02</span>BENCHMARKS
                </a>
                <a 
                  href="/history" 
                  className="px-3 py-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-subtle transition-colors"
                >
                  <span className="text-accent mr-1 font-bold">03</span>RUN HISTORY
                </a>
              </nav>

              {/* Status Indicator & Quick Launch */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-panel-raised border border-subtle rounded text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                  <span className="text-text-secondary">SYSTEM:</span>
                  <span className="text-success font-medium">READY</span>
                </div>

                <a 
                  href="/query" 
                  className="px-3 py-1.5 bg-accent text-primary font-mono text-xs font-semibold rounded hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  <span>LAUNCH QUERY</span>
                  <span>&rarr;</span>
                </a>
              </div>
            </div>
          </header>

          {children}
        </Providers>
      </body>
    </html>
  );
}
