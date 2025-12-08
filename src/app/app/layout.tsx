import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";

const navItems = [
  { label: "Inbox", href: "/app/inbox" },
  { label: "Requests", href: "/app/requests" },
  { label: "Templates", href: "/app/templates" },
  { label: "Analytics", href: "/app/analytics" },
  { label: "Settings", href: "/app/settings" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <AppSidebar
        navItems={navItems}
        userName={session?.user?.name ?? session?.user?.email ?? "User"}
        userRole="Member"
      />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">{children}</div>
      </main>
    </div>
  );
}
