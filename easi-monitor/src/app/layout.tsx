import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ExportProvider } from "@/components/export-queue/export-context";
import { ExportPanel } from "@/components/export-queue/export-panel";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "easi-monitor",
  description: "EASI Evaluation Results Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className="min-h-screen bg-background">
          <header className="border-b bg-card">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <Link href="/" className="text-sm font-mono uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="bg-primary rounded-full w-2 h-2" />
                <span className="text-primary">EASI</span>
                <span className="text-foreground">MONITOR</span>
              </Link>
            </div>
          </header>
          <ExportProvider>
            <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
            <ExportPanel />
          </ExportProvider>
        </div>
      </body>
    </html>
  );
}
