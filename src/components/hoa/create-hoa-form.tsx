"use client";

import { useState, FormEvent } from "react";
import { hoaSchema } from "@/lib/validators";
import { pillButtonClasses } from "@/components/ui/pill-button";

export function CreateHoaForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
    };

    const parsed = hoaSchema.safeParse(payload);
    if (!parsed.success) {
      setError("HOA name should be at least 2 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/hoas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        throw new Error("Unable to create HOA");
      }

      setSuccess("HOA created.");
      window.location.reload();
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create HOA");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
          HOA Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Lakeside Townhomes"
          className="w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 shadow-[0_15px_40px_rgba(15,23,42,0.3)] transition focus:border-white focus:outline-none focus:ring-2 focus:ring-white/60"
        />
      </div>
      {error ? (
        <p className="rounded-2xl border border-red-200/40 bg-red-500/20 px-4 py-2 text-sm text-red-100" aria-live="polite">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-2xl border border-emerald-200/40 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100" aria-live="polite">
          {success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className={pillButtonClasses({ variant: "light", className: "w-full" })}
      >
        {isSubmitting ? "Creating…" : "Create HOA"}
      </button>
    </form>
  );
}
