import Link from "next/link";
import { cookies } from "next/headers";
import { RequestCategory, RequestPriority } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";

type Template = {
  id: string;
  hoaId: string;
  category: RequestCategory;
  priority: RequestPriority | null;
  title: string;
  bodyTemplate: string;
  isDefault: boolean;
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
            <label className="space-y-1 text-sm text-[var(--color-ink)]">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">HOA</span>
              <select
                name="hoaId"
                defaultValue={template?.hoaId ?? ""}
                required
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Select HOA
                </option>
                {hoas.map((hoa) => (
                  <option key={hoa.id} value={hoa.id}>
                    {hoa.name}
                  </option>
                ))}
              </select>
            </label>
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
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Priority</span>
              <select
                name="priority"
                defaultValue={template?.priority ?? ""}
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                {Object.values(RequestPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm text-[var(--color-ink)]">
              <input type="checkbox" name="isDefault" defaultChecked={template?.isDefault ?? false} className="h-4 w-4" />
              <span className="text-sm text-[var(--color-muted)]">Active</span>
            </label>
          </div>

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
                onSubmit={(event) => {
                  if (!confirm("Delete this template? This cannot be undone.")) {
                    event.preventDefault();
                  }
                }}
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
