export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function absoluteUrl(path: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
