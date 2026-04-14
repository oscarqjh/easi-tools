import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Activity } from "lucide-react";
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
            <div className="max-w-7xl mx-auto px-4 py-4">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="size-5 text-primary" />
                easi-monitor
              </h1>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
