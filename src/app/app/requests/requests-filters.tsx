"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { RequestCategory, RequestPriority, RequestStatus } from "@prisma/client";

type Props = {
  resolvedSearch: Record<string, string | string[] | undefined>;
};

const STATUS_OPTIONS: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.AWAITING_REPLY,
  RequestStatus.NEEDS_INFO,
  RequestStatus.IN_PROGRESS,
  RequestStatus.RESOLVED,
  RequestStatus.CLOSED,
];

const PRIORITY_OPTIONS: RequestPriority[] = [
  RequestPriority.URGENT,
  RequestPriority.HIGH,
  RequestPriority.NORMAL,
  RequestPriority.LOW,
];

const CATEGORY_OPTIONS: RequestCategory[] = [
  RequestCategory.MAINTENANCE,
  RequestCategory.VIOLATION,
  RequestCategory.BILLING,
  RequestCategory.GENERAL,
  RequestCategory.BOARD,
  RequestCategory.LEGAL,
  RequestCategory.SPAM,
];

export function RequestsFilters({ resolvedSearch }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const next = params.toString();
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname);
    });
  };

  const currentStatus = typeof resolvedSearch.status === "string" ? resolvedSearch.status : "";
  const currentCategory = typeof resolvedSearch.category === "string" ? resolvedSearch.category : "";
  const currentPriority = typeof resolvedSearch.priority === "string" ? resolvedSearch.priority : "";
  const currentSearch = typeof resolvedSearch.q === "string" ? resolvedSearch.q : "";

  return (
    <form className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm md:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
      <label className="space-y-1 text-[var(--color-muted)]">
        <span className="text-xs font-semibold uppercase tracking-[0.25em]">Status</span>
        <select
          name="status"
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-ink)]"
          disabled={isPending}
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-[var(--color-muted)]">
        <span className="text-xs font-semibold uppercase tracking-[0.25em]">Category</span>
        <select
          name="category"
          value={currentCategory}
          onChange={(e) => updateParam("category", e.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-ink)]"
          disabled={isPending}
        >
          <option value="">All</option>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-[var(--color-muted)]">
        <span className="text-xs font-semibold uppercase tracking-[0.25em]">Priority</span>
        <select
          name="priority"
          value={currentPriority}
          onChange={(e) => updateParam("priority", e.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-ink)]"
          disabled={isPending}
        >
          <option value="">All</option>
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-[var(--color-muted)] md:col-span-1">
        <span className="text-xs font-semibold uppercase tracking-[0.25em]">Search</span>
        <input
          type="text"
          name="q"
          value={currentSearch}
          onChange={(e) => updateParam("q", e.target.value.trim())}
          placeholder="Resident, email, subject"
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-ink)]"
          disabled={isPending}
        />
      </label>
    </form>
  );
}
