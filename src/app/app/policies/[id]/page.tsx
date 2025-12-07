import Link from "next/link";
import { cookies } from "next/headers";
import { RequestCategory, RequestPriority } from "@prisma/client";
import { GlassPanel } from "@/components/ui/glass-panel";

type Policy = {
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
  const cookie = await cookieHeader();
  const res = await fetch(`${baseUrl}/api/policies`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) throw new Error("Failed to load HOAs");
  const data = (await res.json()) as { hoas: Hoa[] };
  return data.hoas;
}

async function fetchPolicy(id: string) {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const cookie = await cookieHeader();
  const res = await fetch(`${baseUrl}/api/policies/${id}`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!res.ok) throw new Error("Policy not found");
  const data = (await res.json()) as { policy: Policy };
  return data.policy;
}

type PageProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PolicyPage({ params }: PageProps) {
  const { id } = params ? await params : { id: "" };
  const isNew = id === "new";
  const hoas = await fetchHoas();
  const policy = isNew ? null : await fetchPolicy(id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Policy</p>
          <h1 className="text-3xl font-semibold text-slate-900">{isNew ? "New template" : policy?.title}</h1>
        </div>
        <Link href="/app/policies" className="text-sm font-semibold text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>

      <GlassPanel className="p-4 space-y-4">
        <form action={isNew ? "/api/policies" : `/api/policies/${id}`} method="post" className="space-y-4">
          {!isNew ? <input type="hidden" name="_method" value="PUT" /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>HOA</span>
              <select
                name="hoaId"
                defaultValue={policy?.hoaId ?? ""}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
            <label className="space-y-1 text-sm text-slate-700">
              <span>Title</span>
              <input
                name="title"
                defaultValue={policy?.title ?? ""}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Category</span>
              <select
                name="category"
                defaultValue={policy?.category ?? RequestCategory.GENERAL}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {Object.values(RequestCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Priority</span>
              <select
                name="priority"
                defaultValue={policy?.priority ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                {Object.values(RequestPriority).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Body template</span>
            <textarea
              name="bodyTemplate"
              defaultValue={policy?.bodyTemplate ?? ""}
              required
              className="min-h-[200px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isDefault" defaultChecked={policy?.isDefault ?? false} className="h-4 w-4" />
            Set as default for this category
          </label>
          <p className="text-xs text-slate-500">Only one default per HOA/category; saving here will replace any previous default.</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Placeholders: {"{{resident_name}}"}, {"{{resident_email}}"}, {"{{hoa_name}}"}, {"{{request_subject}}"}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              {isNew ? "Create template" : "Save changes"}
            </button>
          </div>
        </form>
        {!isNew ? (
          <form action={`/api/policies/${id}`} method="post">
            <input type="hidden" name="_method" value="DELETE" />
            <button
              type="submit"
              className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm"
            >
              Delete
            </button>
          </form>
        ) : null}
      </GlassPanel>
    </div>
  );
}
