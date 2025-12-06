"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

const marketingNavLinks = [
  { label: "Product", href: "/#features" },
  { label: "How it works", href: "/#workflow" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Security", href: "/#security" },
  { label: "FAQ", href: "/#faq" },
];

const opsNavLinks = [
  { label: "Inbox", href: "/app/dashboard" },
  { label: "Automations", href: "/app/automations" },
  { label: "Templates", href: "/app/templates" },
  { label: "Audit Log", href: "/app/audit" },
  { label: "Settings", href: "/app/settings" },
];

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthed = useMemo(() => status === "authenticated" && Boolean(session?.user?.id), [status, session]);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 12);
    handler();
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-200 ${
        isScrolled ? "bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.08)]" : "bg-white/70"
      } backdrop-blur-xl border-b border-white/30`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
            HR
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">HOA Reply AI</p>
            <p className="text-xs text-slate-500">Connect • Normalize • Reply</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {(isAuthed ? opsNavLinks : marketingNavLinks).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {isAuthed ? (
            <>
              <Link
                href="/app/dashboard"
                className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.2)] transition hover:translate-y-0.5"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.2)] transition hover:translate-y-0.5"
              >
                Start free
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <span className="sr-only">Toggle menu</span>
          {menuOpen ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
      {menuOpen ? (
        <div className="md:hidden">
          <div className="mx-4 mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <nav className="flex flex-col gap-4">
              {(isAuthed ? opsNavLinks : marketingNavLinks).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-slate-700"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-3">
              {isAuthed ? (
                <>
                  <Link
                    href="/app/dashboard"
                    className="w-full rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut({ callbackUrl: "/" });
                    }}
                    className="w-full cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="w-full rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="w-full rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
