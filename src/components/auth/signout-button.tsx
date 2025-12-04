"use client";

import { signOut } from "next-auth/react";
import { PillButton } from "@/components/ui/pill-button";

export function SignOutButton() {
  return (
    <PillButton
      type="button"
      variant="secondary"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="bg-white/80"
    >
      Sign out
    </PillButton>
  );
}
