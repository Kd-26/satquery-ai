import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "SatQuery AI – Remote Sensing Workspace",
  description:
    "Query-driven remote sensing workspace. Upload imagery, ask questions, receive scientifically validated answers grounded in evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text-primary antialiased selection:bg-white/10 selection:text-white">
        {children}
      </body>
    </html>
  );
}
