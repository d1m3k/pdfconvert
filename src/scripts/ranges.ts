// Parse "1-3, 5, 8-10" into a sorted set of 0-based page indices.
export function parseRanges(text: string, pageCount: number): number[] {
  const out = new Set<number>();
  for (const part of text.split(',').map(s => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) throw new Error(`"${part}" is not a valid page or range.`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < a || b > pageCount) throw new Error(`"${part}" is outside this document's 1–${pageCount} pages.`);
    for (let p = a; p <= b; p++) out.add(p - 1);
  }
  if (out.size === 0) throw new Error('Enter at least one page or range.');
  return [...out].sort((x, y) => x - y);
}

// Split "1-3, 5, 8-10" into separate [start,end] groups (for one file per range).
export function parseGroups(text: string, pageCount: number): [number, number][] {
  const groups: [number, number][] = [];
  for (const part of text.split(',').map(s => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) throw new Error(`"${part}" is not a valid page or range.`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < a || b > pageCount) throw new Error(`"${part}" is outside this document's 1–${pageCount} pages.`);
    groups.push([a - 1, b - 1]);
  }
  if (groups.length === 0) throw new Error('Enter at least one page or range.');
  return groups;
}
