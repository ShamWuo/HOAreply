import Link from "next/link";
import { cookies } from "next/headers";
import { RequestCategory, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  hoaId: string;
  category: RequestCategory;
  appliesToStatus: RequestStatus | null;
  title: string;
  bodyTemplate: string;
  isDefault: boolean;
  isActive: boolean;
  missingFields: string[];
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
                  <th className="px-4 py-2">Applies when</th>
                  <th className="px-4 py-2">Availability</th>
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
                      <div className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
                        <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          Status: {policy.appliesToStatus ?? "Any"}
                        </span>
                        {policy.missingFields?.length ? (
                          <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            Requires: {policy.missingFields.join(", ")}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--color-muted)]">No missing-field requirements</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                            policy.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700",
                          )}
                        >
                          {policy.isActive ? "Available for use" : "Inactive"}
                        </span>
                        {policy.isDefault ? (
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                            Default for situation
                          </span>
                        ) : null}
                      </div>
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
