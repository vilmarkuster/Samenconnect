export function formatLocation(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  const parts = trimmed.split(/\s+/);
  const formatted = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return formatted;
}

