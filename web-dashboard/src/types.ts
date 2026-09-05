export type School = '초등학교' | '중학교' | '고등학교';

export type Subject = {
  key: string;
  school: School[];
};

export type Archetype = {
  id: string;
  name: string;
  desc: string;
  pages: number;
  blocks: number;
  subjects: string[];
  subjectsResolved: string[];
};

export type StandardItem = {
  code: string;
  text: string;
};

export type UnitGroup = {
  domain: string;
  count: number;
  standards: StandardItem[];
};

export type LlmProviderUi = 'anthropic' | 'openai' | 'custom';

export type GenerateResult = {
  id: string;
  topic: string;
  archetype: string;
  archetypeReason: string;
  standards: StandardItem[];
  pageCount: number;
  gate: {
    student: { ok: boolean; findings: unknown[] };
    teacher: { ok: boolean; findings: unknown[] };
  };
  urls: { student: string; teacher: string };
};

export type StandardsStatus = null | true | false;
