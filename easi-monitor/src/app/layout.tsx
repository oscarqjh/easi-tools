import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
              <h1 className="text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                <div className="bg-primary rounded-full w-2 h-2" />
                <span className="text-primary">EASI</span>
                <span className="text-foreground">MONITOR</span>
              </h1>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
