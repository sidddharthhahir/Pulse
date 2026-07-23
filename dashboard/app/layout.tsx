import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Pulse — Signal Terminal",
  description: "Your personal LinkedIn ghostwriter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="terminal-texture font-sans flex min-h-screen">
        <Sidebar />
        <main className="flex-1 px-14 py-12 max-w-[980px]">{children}</main>
      </body>
    </html>
  );
}
