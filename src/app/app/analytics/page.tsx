import { GlassPanel } from "@/components/ui/glass-panel";

export default function AnalyticsPage() {
  const metrics = [
    { label: "Open requests", value: 0, helper: "Active items" },
    { label: "Requests by category", value: "No data", helper: "Pending data" },
    { label: "Average response time", value: "—", helper: "Hours" },
    { label: "Overdue requests", value: 0, helper: "Past SLA" },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Analytics</p>
        <h1 className="text-3xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-sm text-[var(--color-muted)]">Basic operational visibility only.</p>
      </header>

      <GlassPanel className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-md border border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-ink)]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{metric.value}</p>
              <p className="text-sm text-[var(--color-muted)]">{metric.helper}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Requests by category</p>
        <p className="text-sm text-[var(--color-muted)]">Data not available.</p>
      </GlassPanel>
    </div>
  );
}
