"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const COOLDOWN_MS = 4000;

export function InboxRefreshButton() {
  const router = useRouter();
  const [isCooling, setIsCooling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const refreshing = isSubmitting || isPending;

  const handleRefresh = () => {
    if (refreshing || isCooling) return;

    setIsCooling(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setIsCooling(false), COOLDOWN_MS);

    setIsSubmitting(true);
    fetch("/api/inbox/refresh", { method: "POST" })
      .catch((error) => {
        console.error("inbox refresh failed", error);
      })
      .finally(() => {
        setIsSubmitting(false);
        startTransition(() => router.refresh());
      });
  };

  return (
    <button
      type="button"
      aria-label="Check for new messages"
      title="Check for new messages"
      onClick={handleRefresh}
      disabled={refreshing || isCooling}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/80 text-[var(--color-muted)] shadow-sm transition hover:border-[var(--color-ink)]/30 hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className={refreshing ? "animate-spin" : ""}>⟳</span>
    </button>
  );
}
