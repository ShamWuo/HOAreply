"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string };

type AppSidebarProps = {
  navItems: NavItem[];
  userName?: string | null;
  userRole?: string | null;
};

export function AppSidebar({ navItems, userName, userRole }: AppSidebarProps) {
  const pathname = usePathname() ?? "";
  const active = navItems.find((item) => pathname.startsWith(new URL(item.href, "https://example.com").pathname));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-muted)]">
      <div className="px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">HOA Reply</p>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = active?.label === item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-[var(--color-muted)] transition",
                isActive ? "bg-[var(--color-border)]/40 text-[var(--color-ink)]" : "hover:bg-[var(--color-border)]/30",
              )}
            >
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--color-border)] px-4 py-4">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{userName ?? "User"}</p>
        <p className="text-xs text-[var(--color-muted)]">{userRole ?? "Member"}</p>
      </div>
    </aside>
  );
}
