import type { LlmProviderUi } from './types.ts';

export const MODEL_OPTIONS: Record<Exclude<LlmProviderUi, 'custom'>, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 — 추천(속도·지능 균형)' },
    { value: 'claude-opus-5', label: 'Claude Opus 5 (복잡한 작업·고성능)' },
    { value: 'claude-fable-5', label: 'Claude Fable 5 (최상위·장기 에이전트)' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (최속·경제적)' },
    { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (이전 세대)' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (이전 세대)' },
  ],
  openai: [
    { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol — 추천(플래그십)' },
    { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra (균형·비용 절감)' },
    { value: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (초경제형)' },
    { value: 'gpt-5.3-codex', label: 'GPT-5.3 Codex (에이전틱 코딩 특화)' },
  ],
};

export const ARCH_ICON: Record<string, string> = {
  'experimental-inquiry': '🔬',
  'data-interpretation': '📊',
  'reading-comprehension': '📖',
  'discussion-decision': '💬',
  'concept-structuring': '🧩',
  'project-making': '🛠️',
  'vocabulary-concept': '🔤',
  'kwl-inquiry': '🧠',
  'writing-plan': '✍️',
  'concept-visual': '🎯',
  'process-structure': '🔀',
  'literary-response': '📚',
  'landscape-organizer': '🖼️',
  'concept-example-practice': '➗',
};

export function subjectKeyOf(subject: string): string {
  const map: Record<string, string> = {
    과학: 'science',
    통합과학: 'science',
    국어: 'korean',
    '독서와 작문': 'korean',
    사회: 'social',
    역사: 'social',
    영어: 'english',
  };
  const nonMath = Object.keys(map);
  return nonMath.includes(subject) ? map[subject] : 'math';
}

export function gradeLabel(school: string, gradeNum: string): string {
  const prefix = { 초등학교: '초', 중학교: '중', 고등학교: '고' }[school] ?? '';
  return `${prefix}${gradeNum}`;
}
