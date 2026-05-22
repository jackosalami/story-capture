import type { Story } from "../db/types";

// Try to extract a year from the storyDate free-text field.
// Returns null if no plausible year is found.
function extractYear(text: string): number | null {
  const m = text.match(/\b(1[89]\d{2}|20\d{2})\b/);
  if (m) return parseInt(m[1], 10);
  return null;
}

// Group stories by decade derived from storyDate ("primavera 1972" → 1970s).
// Stories without a parseable year go into a "Sin fecha" bucket.

export interface DecadeGroup {
  key: string; // "1970s" or "undated"
  label: string; // "Años 70" or "Sin fecha"
  stories: Story[];
}

export function groupByDecade(stories: Story[]): DecadeGroup[] {
  const buckets = new Map<string, Story[]>();
  for (const s of stories) {
    const year = extractYear(s.storyDate);
    const key = year === null ? "undated" : `${Math.floor(year / 10) * 10}s`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s);
  }
  const keys = Array.from(buckets.keys()).sort((a, b) => {
    if (a === "undated") return 1;
    if (b === "undated") return -1;
    return parseInt(a) - parseInt(b);
  });
  return keys.map((key) => ({
    key,
    label: labelForDecade(key),
    stories: buckets.get(key)!,
  }));
}

function labelForDecade(key: string): string {
  if (key === "undated") return "Sin fecha";
  const decade = key.slice(0, 4);
  return `Años ${decade.slice(-2)}`;
}

// Group stories by mood tags. A story with multiple moods appears in each bucket.
export interface ThemeGroup {
  mood: string;
  stories: Story[];
}

export function groupByTheme(stories: Story[]): ThemeGroup[] {
  const buckets = new Map<string, Story[]>();
  for (const s of stories) {
    if (s.mood.length === 0) {
      if (!buckets.has("__untagged__")) buckets.set("__untagged__", []);
      buckets.get("__untagged__")!.push(s);
    } else {
      for (const m of s.mood) {
        if (!buckets.has(m)) buckets.set(m, []);
        buckets.get(m)!.push(s);
      }
    }
  }
  const result: ThemeGroup[] = [];
  for (const [mood, group] of buckets) {
    result.push({
      mood: mood === "__untagged__" ? "Sin tema" : mood,
      stories: group,
    });
  }
  // Sort: largest bucket first, "Sin tema" last
  result.sort((a, b) => {
    if (a.mood === "Sin tema") return 1;
    if (b.mood === "Sin tema") return -1;
    return b.stories.length - a.stories.length;
  });
  return result;
}
