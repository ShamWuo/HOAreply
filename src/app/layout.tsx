import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/session-provider";
import { PrivacyBanner } from "@/components/ui/privacy-banner";
import { cn } from "@/lib/utils";
import { baseMetadata } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  ...baseMetadata,
  keywords: ["HOA", "HOA management", "Gmail", "AI", "email assistant", "community association"],
  authors: [{ name: "HOA Reply AI" }],
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
          display.variable,
          "min-h-screen bg-slate-50 text-slate-900 antialiased",
        )}
      >
        <div className="relative min-h-screen bg-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_45%)]" />
          <div className="relative">
            <AuthProvider>
              <PrivacyBanner />
              {children}
            </AuthProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
