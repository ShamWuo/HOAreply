"use client";

import { useState, FormEvent } from "react";
import { hoaSchema } from "@/lib/validators";

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          HOA Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Lakeside Townhomes"
          className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
      >
        {isSubmitting ? "Creating…" : "Create HOA"}
      </button>
    </form>
  );
}
