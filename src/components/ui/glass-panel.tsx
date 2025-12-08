import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GlassPanelProps = HTMLAttributes<HTMLDivElement>;

export function GlassPanel({ className, ...props }: GlassPanelProps) {
  return <div className={cn("panel p-4 text-[var(--color-ink)]", className)} {...props} />;
}
