import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PillVariant = "primary" | "secondary" | "light" | "ghost";
type PillSize = "md" | "sm";

const baseClasses =
  "inline-flex items-center justify-center rounded-full font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const variantClasses: Record<PillVariant, string> = {
  primary: "bg-slate-900 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] hover:-translate-y-0.5 focus-visible:outline-slate-900",
  secondary: "border border-slate-200 text-slate-700 hover:border-blue-200 hover:text-blue-600 focus-visible:outline-blue-500",
  light: "bg-white text-slate-900 shadow-[0_20px_55px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 focus-visible:outline-white",
  ghost: "border border-transparent text-slate-600 hover:text-slate-900 focus-visible:outline-slate-400",
};

const sizeClasses: Record<PillSize, string> = {
  md: "px-5 py-3 text-sm",
  sm: "px-3 py-2 text-xs uppercase tracking-[0.3em]",
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
