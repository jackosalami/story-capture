// Split a kid story's prose into N contiguous sections of paragraphs.
// Used by the book reader so each spread shows one image + one section of text.

export function splitStoryIntoSections(content: string, n: number): string[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (n <= 0) return [content];
  if (paragraphs.length <= n) {
    // Pad with empty strings so the caller always gets exactly n entries.
    const out = paragraphs.slice();
    while (out.length < n) out.push("");
    return out;
  }
  const sections: string[] = [];
  const perSection = paragraphs.length / n;
  for (let i = 0; i < n; i++) {
    const start = Math.round(i * perSection);
    const end = Math.round((i + 1) * perSection);
    sections.push(paragraphs.slice(start, end).join("\n\n"));
  }
  return sections;
}
