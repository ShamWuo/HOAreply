import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GlassPanelVariant = "default" | "frosted" | "dark";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  variant?: GlassPanelVariant;
};

const variantClasses: Record<GlassPanelVariant, string> = {
  default: "border-white/70 bg-white/95 text-slate-900 shadow-[0_35px_90px_rgba(15,23,42,0.12)]",
  frosted: "border-white/60 bg-slate-50/85 text-slate-900 shadow-[0_25px_70px_rgba(15,23,42,0.1)]",
  dark: "border-white/20 bg-white/10 text-white shadow-[0_45px_120px_rgba(15,23,42,0.4)]",
};

export function GlassPanel({ variant = "default", className, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-[32px] border backdrop-blur",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
