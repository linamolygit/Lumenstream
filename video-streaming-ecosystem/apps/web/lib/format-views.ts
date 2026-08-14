/**
 * Shared view count formatter.
 * Handles: number, numeric string ("1246522"), already-formatted ("1.2M views"), null/undefined.
 * Always outputs compact K/M format: 1246522 → "1.2M", 12345 → "12.3K", 999 → "999"
 */
export function formatViews(
  views?: number | string | null,
  suffix: "views" | "none" = "none"
): string {
  if (views == null || views === "") {
    return suffix === "views" ? "0 views" : "0";
  }

  let n: number;

  if (typeof views === "string") {
    // Strip any existing "views" word and commas, then parse
    const cleaned = views.replace(/,/g, "").replace(/\s*views?/gi, "").trim();

    // If it already has K/M/B suffix (e.g. "1.2M", "23K"), return as-is with optional suffix
    if (/^[\d.]+[KkMmBb]$/i.test(cleaned)) {
      const upper = cleaned.toUpperCase();
      return suffix === "views" ? `${upper} views` : upper;
    }

    n = parseFloat(cleaned);
    if (isNaN(n)) {
      // Unrecognized string — return cleaned version
      return suffix === "views" ? `${cleaned} views` : cleaned;
    }
  } else {
    n = views;
  }

  // Format number as compact K/M/B
  let formatted: string;
  if (n >= 1_000_000_000) {
    formatted = `${(n / 1_000_000_000).toFixed(1)}B`;
  } else if (n >= 1_000_000) {
    formatted = `${(n / 1_000_000).toFixed(1)}M`;
  } else if (n >= 1_000) {
    formatted = `${(n / 1_000).toFixed(1)}K`;
  } else {
    formatted = String(Math.floor(n));
  }

  return suffix === "views" ? `${formatted} views` : formatted;
}
