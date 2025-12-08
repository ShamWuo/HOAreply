import { GlassPanel } from "@/components/ui/glass-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Settings</p>
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
      </header>

      <GlassPanel className="p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">HOA Information</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-[var(--color-ink)]">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Name</span>
            <input className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm" defaultValue="" />
          </label>
          <label className="space-y-1 text-sm text-[var(--color-ink)]">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Timezone</span>
            <select className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm" defaultValue="">
              <option value="" disabled>
                Select timezone
              </option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Gmail Connections</p>
        <div className="space-y-2 text-sm text-[var(--color-muted)]">
          <p>No connected inboxes.</p>
          <button className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]">
            Connect Gmail
          </button>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Users & Roles</p>
        <div className="space-y-3 text-sm text-[var(--color-ink)]">
          <div className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-ink)]">User</span>
              <select className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-sm" defaultValue="Member">
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Defaults</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-[var(--color-ink)]">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Default template (Category)</span>
            <select className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm" defaultValue="">
              <option value="">None</option>
            </select>
          </label>
        </div>
      </GlassPanel>
    </div>
  );
}
