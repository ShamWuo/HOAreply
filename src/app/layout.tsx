import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoardInbox AI Connect",
  description: "Connect HOA Gmail inboxes to BoardInbox AI workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "min-h-screen bg-slate-50 text-slate-900 antialiased",
        )}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
