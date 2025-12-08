import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";
import { baseMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  ...baseMetadata,
  keywords: ["HOA", "HOA management", "Gmail", "AI", "email assistant", "community association"],
  authors: [{ name: "HOA Reply AI" }],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={cn(
          inter.variable,
          "min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] antialiased",
        )}
      >
        <div className="flex min-h-screen flex-col">
          <AuthProvider>
            <SiteHeader />
            <main className="flex-1 bg-[var(--color-bg)]">{children}</main>
          </AuthProvider>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
