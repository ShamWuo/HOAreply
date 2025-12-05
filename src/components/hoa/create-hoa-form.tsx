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
        <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
          HOA Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Lakeside Townhomes"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" aria-live="polite">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700" aria-live="polite">
          {success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className={pillButtonClasses({ variant: "primary", className: "w-full cursor-pointer" })}
      >
        {isSubmitting ? "Creating..." : "Create HOA"}
      </button>
    </form>
  );
}




