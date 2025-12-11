"use client";

import { useState } from "react";
import { hoaUpdateSchema } from "@/lib/validators";

type Props = {
  hoaId: string;
  initialEnabled: boolean;
};

export function RiskProtectionToggle({ hoaId, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    const payload = { riskProtectionEnabled: !enabled };
    const parsed = hoaUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      setError("Unable to update risk setting.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/hoas/${hoaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Update failed");
      }
      setEnabled(!enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-3 py-2 text-sm text-white shadow-sm">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-200">Risk Protection</p>
          <p className="text-[13px] text-slate-100">
            Blocks risky replies and requires complete details for board/violation/billing before sending.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={isSaving}
          aria-pressed={enabled}
          className={`relative inline-flex h-9 w-16 items-center rounded-full border border-white/40 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
            enabled ? "bg-emerald-400 text-emerald-950" : "bg-white/20 text-white"
          } disabled:opacity-60 cursor-pointer`}
        >
          <span
            className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
          <span className="w-full text-center">{enabled ? "On" : "Off"}</span>
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
