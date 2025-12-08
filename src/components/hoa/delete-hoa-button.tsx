"use client";

import { useState } from "react";

type Props = {
  hoaId: string;
  className?: string;
};

export function DeleteHoaButton({ hoaId, className }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Delete this HOA? This also removes connected Gmail and threads.")) return;
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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className={`inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-60 ${className ?? ""}`}
      >
        {isDeleting ? "Deleting..." : "Delete HOA"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
