import type {
  Archetype,
  GenerateResult,
  School,
  StandardItem,
  Subject,
  UnitGroup,
} from './types.ts';

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(data.error || '요청에 실패했습니다.');
  return data;
}

export function fetchSubjects() {
  return getJson<{ subjects: Subject[] }>('/api/subjects');
}

export function fetchArchetypes() {
  return getJson<{ archetypes: Archetype[] }>('/api/archetypes');
}

export function searchStandards(params: {
  school: School;
  subject: string;
  keyword: string;
  grade?: string;
  limit?: number;
}) {
  const q = new URLSearchParams({
    school: params.school,
    subject: params.subject,
    keyword: params.keyword,
    limit: String(params.limit ?? 5),
  });
  if (params.grade) q.set('grade', params.grade);
  return getJson<{ results: StandardItem[] }>(`/api/standards/search?${q}`);
}

export function fetchUnits(params: { school: School; subject: string; grade: string }) {
  const q = new URLSearchParams(params);
  return getJson<{ groups: UnitGroup[] }>(`/api/units?${q}`);
}

export async function generateWorksheet(body: unknown): Promise<GenerateResult> {
  const r = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await r.json()) as GenerateResult & { error?: string };
  if (!r.ok) throw new Error(data.error || '생성에 실패했습니다.');
  return data;
}
