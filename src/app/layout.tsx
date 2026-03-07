import type { Metadata } from "next";
import "./globals.css";

import { CustomCursor } from "@/components/CustomCursor";

export const metadata: Metadata = {
  title: "SEISMOS — Seismic Event Intelligence System",
  description: "Automated planetary seismic detection for Apollo (Moon) and InSight (Mars) missions. Multi-origin signal classification with F1 ≥ 0.90.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-red-500/30">
        <div className="noise" />
        <CustomCursor />

        {children}

      </body>
    </html>
  );
}
