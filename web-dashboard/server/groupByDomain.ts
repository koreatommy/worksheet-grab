export type StandardItem = { code: string; text: string };

export function domainOf(code: string): string {
  const m = /^\[?\d+[가-힣]+(\d+)-\d+\]?$/.exec(String(code).trim());
  return m ? m[1] : '기타';
}

export function groupByDomain(standards: StandardItem[]) {
  const map = new Map<string, StandardItem[]>();
  for (const s of standards) {
    const d = domainOf(s.code);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(s);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([domain, items]) => ({ domain, count: items.length, standards: items }));
}
