import Link from "next/link";
import { RequestCategory, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { DeleteHoaButton } from "@/components/hoa/delete-hoa-button";
import { auth } from "@/lib/auth";
import { getSettingsOverview } from "@/lib/queries/settings";

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <GlassPanel className="p-10 text-center text-sm text-[var(--color-muted)]">
        Please sign in to view settings.
      </GlassPanel>
    );
  }

  const overview = await getSettingsOverview(session.user.id);
  const { hoas } = overview;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Settings</p>
        <h1 className="text-3xl font-semibold text-slate-900">Workspace settings</h1>
        <p className="text-sm text-[var(--color-muted)]">See connected HOAs, Gmail inboxes, defaults, and your role.</p>
      </header>

      <GlassPanel className="p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">HOA Workspaces</p>

        {hoas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white/70 p-10 text-center text-sm text-[var(--color-muted)]">
            No HOAs yet. Create an HOA to unlock Gmail sync and routing.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {hoas.map((hoa) => {
              const connected = Boolean(hoa.gmail);
              return (
                <div key={hoa.id} className="rounded-xl border border-[var(--color-border)] bg-white/80 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">HOA</p>
                      <p className="text-lg font-semibold text-[var(--color-ink)]">{hoa.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">Created {formatDate(hoa.createdAt)}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        connected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {connected ? "Gmail connected" : "No Gmail"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[var(--color-ink)]">
                    <div className="rounded-lg bg-[var(--color-surface)] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Open requests</p>
                      <p className="text-base font-semibold">{hoa.stats.openRequests}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-surface)] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Total requests</p>
                      <p className="text-base font-semibold">{hoa.stats.requests}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-surface)] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Threads tracked</p>
                      <p className="text-base font-semibold">{hoa.stats.threads}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-surface)] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">Default templates</p>
                      <p className="text-base font-semibold">{Object.values(hoa.defaults).reduce((sum, byStatus) => sum + Object.keys(byStatus ?? {}).length, 0)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/app/hoa/${hoa.id}`}
                      className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
                    >
                      Open workspace
                    </Link>
                    <Link
                      href="/app/inbox"
                      className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
                    >
                      View inbox
                    </Link>
                    <Link
                      href={`/connect/gmail?hoaId=${hoa.id}`}
                      className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-3 py-2 text-sm font-semibold text-white"
                    >
                      {connected ? "Reconnect Gmail" : "Connect Gmail"}
                    </Link>
                    <DeleteHoaButton hoaId={hoa.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Defaults</p>
        {hoas.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Add an HOA to set default responses.</p>
        ) : (
          <div className="space-y-4">
            {hoas.map((hoa) => (
              <div key={hoa.id} className="rounded-lg border border-[var(--color-border)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{hoa.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{hoa.stats.requests} requests tracked</p>
                  </div>
                  <Link href="/app/templates" className="text-xs font-semibold text-[var(--color-ink)] hover:underline">
                    Manage templates
                  </Link>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Object.values(RequestCategory).map((category) => {
                    const byStatus = hoa.defaults[category] ?? {};
                    return (
                      <div key={`${hoa.id}-${category}`} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">{humanize(category)}</p>
                        <div className="mt-2 space-y-1 text-sm text-[var(--color-ink)]">
                          {Object.values(RequestStatus).map((status) => {
                            const def = byStatus[status];
                            return (
                              <div key={`${hoa.id}-${category}-${status}`} className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2">
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{humanize(status)}</p>
                                  <p className="font-semibold text-[var(--color-ink)]">{def ? def.title : "No default template"}</p>
                                  <p className="text-[11px] text-[var(--color-muted)]">{def?.updatedAt ? `Updated ${formatDate(def.updatedAt)}` : "Not set"}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {def?.templateId ? (
                                    <Link href={`/app/templates/${def.templateId}`} className="text-xs font-semibold text-[var(--color-ink)] hover:underline">
                                      Open template
                                    </Link>
                                  ) : (
                                    <Link href="/app/templates/new" className="text-xs font-semibold text-[var(--color-ink)] hover:underline">
                                      Set default
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Users & Roles</p>
        <div className="rounded-lg border border-[var(--color-border)] bg-white/80 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{session.user.name ?? session.user.email}</p>
              <p className="text-xs text-[var(--color-muted)]">{session.user.email}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
              Owner
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">You&apos;re the only member today. Roles and invites will land here.</p>
        </div>
      </GlassPanel>
    </div>
  );
}
