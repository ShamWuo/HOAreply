"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PRIVACY_URL = "https://hoareply.com/privacy";

const STORAGE_KEY = "hoareply_privacy_banner_dismissed";

export function PrivacyBanner() {
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  function onDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="z-50 w-full bg-yellow-50 border-t border-b border-yellow-200 text-yellow-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 text-sm">
        <div>
          <strong>Privacy notice:</strong>{" "}
          When you connect Gmail we access message content to classify and generate reply drafts. See our <Link href={PRIVACY_URL} className="underline">Privacy Policy</Link> for details.
        </div>
        <div>
          <button onClick={onDismiss} className="rounded bg-yellow-200 px-3 py-1 text-sm font-semibold">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
