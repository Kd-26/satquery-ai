import type { Metadata } from"next";
import { Inter, JetBrains_Mono } from"next/font/google";
import"./globals.css";

const inter = Inter({ subsets: ["latin"], variable:"--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable:"--font-jetbrains-mono" });

export const metadata: Metadata = {
 title:"SatQuery AI",
 description:"Neuro-symbolic satellite imagery analysis.",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en">
 <body
 className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-primary text-text-primary font-sans`}
 >
 <nav className="p-4 bg-panel border-b border-subtle flex gap-4 text-sm font-medium">
 <a href="/" className="text-text-secondary hover:text-text-primary transition-colors">Home (Quick Query)</a>
 <a href="/benchmark" className="text-text-secondary hover:text-text-primary transition-colors">Benchmark</a>
 <a href="/history" className="text-text-secondary hover:text-text-primary transition-colors">History</a>
 </nav>
 {children}
 </body>
 </html>
 );
}
