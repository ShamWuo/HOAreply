import Link from "next/link";
import { cookies } from "next/headers";
import { RequestCategory, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

type Policy = {
  id: string;
  hoaId: string;
  category: RequestCategory;
  requestStatus: RequestStatus;
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

async function fetchPolicies(): Promise<{ policies: Policy[]; hoas: Hoa[] }> {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const cookie = await cookieHeader();
  const res = await fetch(`${baseUrl}/api/policies`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) {
    throw new Error("Failed to load policies");
  }
  return res.json();
}

type PageProps = {
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PoliciesPage({}: PageProps) {
  const { policies, hoas } = await fetchPolicies();
  const hoaMap = new Map(hoas.map((h) => [h.id, h.name]));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Policies</p>
          <h1 className="text-3xl font-semibold text-slate-900">Policy templates</h1>
          <p className="text-sm text-slate-600">Templates govern approved language per category and request status.</p>
        </div>
        <Link href="/app/policies/new" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm">
          New template
        </Link>
      </div>

      <GlassPanel className="p-4">
        {policies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
            No policy templates yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">HOA</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Request Status</th>
                  <th className="px-3 py-2">Default</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <Link href={`/app/policies/${policy.id}`} className="font-semibold text-slate-900 hover:underline">
                        {policy.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{hoaMap.get(policy.hoaId) ?? "Unknown"}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {policy.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {policy.requestStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em]",
                          policy.isDefault ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {policy.isDefault ? "Default" : "Custom"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <span className="block max-w-md text-sm text-slate-600">
                        {policy.bodyTemplate.length > 140 ? `${policy.bodyTemplate.slice(0, 140)}...` : policy.bodyTemplate}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{new Date(policy.updatedAt).toLocaleString()}</td>
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
