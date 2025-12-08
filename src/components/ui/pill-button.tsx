import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PillVariant = "primary" | "secondary" | "light" | "ghost";
type PillSize = "md" | "sm";

const baseClasses =
  "inline-flex items-center justify-center rounded-full font-semibold transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2";

const variantClasses: Record<PillVariant, string> = {
  primary: "bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[#1b3043] focus-visible:outline-[var(--color-accent)]",
  secondary: "border border-[var(--color-border)] text-[var(--color-ink)] bg-white hover:border-[#cdd2d8] focus-visible:outline-[var(--color-accent)]",
  light: "bg-white text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[#f3f4f6] focus-visible:outline-[var(--color-accent)]",
  ghost: "text-[var(--color-ink)] border border-transparent hover:bg-[#f3f4f6] focus-visible:outline-[var(--color-accent)]",
};

const sizeClasses: Record<PillSize, string> = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-2 text-xs tracking-tight",
};

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillVariant;
  size?: PillSize;
}

export function pillButtonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: PillVariant;
  size?: PillSize;
  className?: string;
} = {}) {
  return cn(baseClasses, sizeClasses[size], variantClasses[variant], className);
}

export function PillButton({ variant = "primary", size = "md", className, ...props }: PillButtonProps) {
  return <button className={pillButtonClasses({ variant, size, className })} {...props} />;
}
