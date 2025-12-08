import Link from "next/link";
import { cookies } from "next/headers";
import { RequestCategory, RequestStatus } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";

type Template = {
  id: string;
  hoaId: string;
  category: RequestCategory;
  requestStatus: RequestStatus;
  title: string;
  bodyTemplate: string;
  isDefault: boolean;
  isActive: boolean;
  missingFields: string[];
};

type Hoa = { id: string; name: string };

async function cookieHeader() {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function fetchHoas() {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/policies`, {
    cache: "no-store",
    headers: { cookie: await cookieHeader() },
  });
  if (!res.ok) throw new Error("Failed to load HOAs");
  const data = (await res.json()) as { hoas: Hoa[] };
  return data.hoas;
}

async function fetchTemplate(id: string) {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/policies/${id}`, {
    cache: "no-store",
    headers: { cookie: await cookieHeader() },
  });
  if (!res.ok) throw new Error("Template not found");
  const data = (await res.json()) as { policy: Template };
  return data.policy;
}

type PageProps = {
  params?: Promise<{ id: string }>;
};

export default async function TemplateDetailPage({ params }: PageProps) {
  const { id } = params ? await params : { id: "" };
  const isNew = id === "new";
  const hoas = await fetchHoas();
  const template = isNew ? null : await fetchTemplate(id);
  const hoaName = template ? hoas.find((h) => h.id === template.hoaId)?.name ?? "" : hoas[0]?.name ?? "";
  const hoaId = template ? template.hoaId : hoas[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Template</p>
          <h1 className="text-3xl font-semibold text-slate-900">{isNew ? "New Template" : template?.title}</h1>
        </div>
        <Link href="/app/templates" className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          Cancel
        </Link>
      </div>

      <GlassPanel className="p-6 space-y-4">
        <form action={isNew ? "/api/policies" : `/api/policies/${id}`} method="post" className="space-y-4">
          {!isNew ? <input type="hidden" name="_method" value="PUT" /> : null}
          <input type="hidden" name="hoaId" value={hoaId} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-[var(--color-ink)]">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Template Name</span>
              <input
                name="title"
                defaultValue={template?.title ?? ""}
                required
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="space-y-1 text-sm text-[var(--color-ink)]">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">HOA</span>
              <div className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
                {hoaName || "Current HOA"}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm text-[var(--color-ink)]">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Category</span>
              <select
                name="category"
                defaultValue={template?.category ?? RequestCategory.GENERAL}
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              >
                {Object.values(RequestCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-[var(--color-ink)]">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Request Status</span>
              <select
                name="requestStatus"
                defaultValue={template?.requestStatus ?? RequestStatus.OPEN}
                required
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              >
                {Object.values(RequestStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--color-muted)]">Default templates are suggested automatically when a request enters this status.</p>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm text-[var(--color-ink)]">
              <input type="checkbox" name="isDefault" defaultChecked={template?.isDefault ?? false} className="h-4 w-4" />
              <span className="text-sm text-[var(--color-muted)]">Default for this situation</span>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm text-[var(--color-ink)]">
              <input type="checkbox" name="isActive" defaultChecked={template?.isActive ?? true} className="h-4 w-4" />
              <span className="text-sm text-[var(--color-muted)]">Available for use</span>
            </label>
          </div>

          <label className="space-y-1 text-sm text-[var(--color-ink)]">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Requires missing fields</span>
            <input
              name="missingFields"
              defaultValue={template?.missingFields?.join(", ") ?? ""}
              placeholder="Comma-separated keys, e.g. unit_number, photos"
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-[var(--color-muted)]">Used to gate suggestions when these fields are missing.</p>
          </label>

          <label className="space-y-1 text-sm text-[var(--color-ink)]">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Template Body</span>
            <textarea
              name="bodyTemplate"
              defaultValue={template?.bodyTemplate ?? ""}
              required
              className="min-h-[240px] w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            />
          </label>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
            Placeholder cheatsheet: {"{{resident_name}}"}, {"{{hoa_name}}"}, {"{{unit}}"}, {"{{issue_summary}}"}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-white"
            >
              Save
            </button>
            <Link
              href="/app/templates"
              className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
            >
              Cancel
            </Link>
            {!isNew ? (
              <form
                action={`/api/policies/${id}`}
                method="post"
                className="inline-flex"
              >
                <input type="hidden" name="_method" value="DELETE" />
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                >
                  Delete
                </button>
              </form>
            ) : null}
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}
