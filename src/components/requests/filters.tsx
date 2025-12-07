"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FilterProps = {
  statuses: string[];
  priorities: string[];
  categories: string[];
};

function buildQuery(next: Record<string, string | undefined>, searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  Object.entries(next).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  params.delete("page");
  return params.toString();
}

export function RequestFilters({ statuses, priorities, categories }: FilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams?.get("q") ?? searchParams?.get("search") ?? "");
  const legalActive = searchParams?.get("legal") === "true";

  const apply = useCallback(
    (next: Record<string, string | undefined>) => {
      const query = buildQuery(next, new URLSearchParams(searchParams?.toString() ?? ""));
      router.push(query ? `/app/requests?${query}` : "/app/requests");
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => {
          const active = searchParams?.get("status") === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => apply({ status: active ? undefined : status })}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:border-blue-200"
              }`}
            >
              {status}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          value={searchParams?.get("priority") ?? ""}
          onChange={(e) => apply({ priority: e.target.value || undefined })}
        >
          <option value="">All priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          value={searchParams?.get("category") ?? ""}
          onChange={(e) => apply({ category: e.target.value || undefined })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex flex-1 items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resident, email, subject"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={() => apply({ q: search || undefined })}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Search
          </button>
        </div>
        <button
          type="button"
          onClick={() => apply({ legal: legalActive ? undefined : "true" })}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
            legalActive ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-700 hover:border-red-200"
          }`}
        >
          Legal risk
        </button>
      </div>
    </div>
  );
}
