"use client";

import { useState } from "react";
import { hoaSchema } from "@/lib/validators";

type Props = {
  hoaId: string;
  initialName: string;
  inboxUrl: string;
  detailsUrl: string;
};

export function HoaCardControls({ hoaId, initialName, inboxUrl, detailsUrl }: Props) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const parsed = hoaSchema.safeParse({ name });
    if (!parsed.success) {
      setError("HOA name should be at least 2 characters.");
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch(`/api/hoas/${hoaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.data.name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Update failed");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this HOA? This removes connected Gmail and threads.")) return;
    setError(null);
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/hoas/${hoaId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Delete failed");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-slate-900 disabled:opacity-60 cursor-pointer"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <a
          href={detailsUrl}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-slate-900"
        >
          Details
        </a>
        <a
          href={inboxUrl}
          className="inline-flex items-center gap-1 rounded-xl border border-blue-300 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          Inbox
        </a>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100 disabled:opacity-60 cursor-pointer"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
