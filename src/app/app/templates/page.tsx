import Link from "next/link";
import { cookies } from "next/headers";
import { RequestCategory, RequestPriority } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  hoaId: string;
  category: RequestCategory;
  priority: RequestPriority | null;
  title: string;
  bodyTemplate: string;
  isDefault: boolean;
  updatedAt: string;
};

type Hoa = { id: string; name: string };

async function cookieHeader() {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function fetchTemplates(): Promise<{ policies: Template[]; hoas: Hoa[] }> {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/policies`, {
    cache: "no-store",
    headers: { cookie: await cookieHeader() },
  });
  if (!res.ok) throw new Error("Failed to load templates");
  return res.json();
}

export default async function TemplatesPage() {
  const { policies, hoas } = await fetchTemplates();
  const hoaMap = new Map(hoas.map((hoa) => [hoa.id, hoa.name]));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Templates</p>
        <h1 className="text-3xl font-semibold text-slate-900">Templates</h1>
        <p className="text-sm text-[var(--color-muted)]">Manage approved response language.</p>
      </header>

      <div className="flex items-center justify-between">
        <div />
        <Link
          href="/app/templates/new"
          className="rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
        >
          New Template
        </Link>
      </div>

      <GlassPanel className="p-0">
        {policies.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--color-muted)]">No templates yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-2">Template Name</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Priority</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {policies.map((policy) => (
                  <tr key={policy.id} className="relative hover:bg-slate-50">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-[var(--color-ink)]">{policy.title}</p>
                      <p className="text-xs text-[var(--color-muted)]">{hoaMap.get(policy.hoaId) ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{policy.category}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          policy.priority === RequestPriority.URGENT || policy.priority === RequestPriority.HIGH
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {policy.priority ?? "Any"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          policy.isDefault ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {policy.isDefault ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-[var(--color-muted)]">{new Date(policy.updatedAt).toLocaleString()}</td>
                    <Link href={`/app/templates/${policy.id}`} className="absolute inset-0" aria-label={`Open template ${policy.title}`} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
