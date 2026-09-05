type LlmConfig = {
  provider: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
};

type FillArgs = {
  manifest: { pages: unknown[][]; standards: unknown; standardsText: unknown };
  brief: unknown;
  topic: string;
  school?: string;
  grade?: string;
  subject: string;
  llm: LlmConfig;
};

export async function fillManifestWithLLM({
  manifest,
  brief,
  topic,
  school,
  grade,
  subject,
  llm,
}: FillArgs) {
  const raw = JSON.stringify(manifest);
  const system = [
    '당신은 한국 초·중·고 교사를 돕는 활동지 저작 도우미입니다.',
    '아래 JSON은 활동지 매니페스트입니다. 각 블록의 html 필드에는 "예시(다른 주제)" 문구나 "［…슬롯］" 자리표시가 들어 있습니다.',
    `이것을 학교급 "${school || ''}" 학년 "${grade || ''}" 교과 "${subject}" 주제 "${topic}"에 맞는 실제 교육 콘텐츠로 다시 작성하세요.`,
    '규칙(반드시 준수):',
    '1. JSON의 키 이름, 구조, 페이지 수, 블록 개수와 순서, id, type, class, standards, standardsText 필드는 절대 변경하지 마세요. html 필드의 텍스트 내용만 교체하세요.',
    '2. 기존 HTML 태그 구조(예: <div class="qbox">…</div>)는 유지하고 그 안의 텍스트만 주제에 맞게 바꾸세요.',
    '3. "［…슬롯］" 형태의 자리표시가 있으면 반드시 실제 내용으로 채우세요. 다른 주제의 예시 문장도 모두 새 주제에 맞게 바꾸세요.',
    '4. class="answer"를 포함하는 위치, hbox, work-space 등 정답·예시풀이 영역에는 실제 예시 정답을 채우세요.',
    '5. 성취기준 원문(standardsText)과 standard-label 블록은 절대 창작하거나 수정하지 말고 그대로 유지하세요.',
    '6. 학년 수준에 맞는 난이도와 어휘를 사용하세요.',
    '7. 결과는 오직 완전한 JSON 객체만 출력하세요. 설명, 마크다운 코드펜스, 주석을 포함하지 마세요.',
  ].join('\n');

  const user = [
    `학교급: ${school || '(미지정)'}  학년: ${grade || '(미지정)'}  교과: ${subject}  주제: ${topic}`,
    brief
      ? `저작 가이드(참고용, 출력하지 마세요 — 각 블록이 무엇을 담아야 하는지 안내): ${JSON.stringify(brief).slice(0, 4000)}`
      : '',
    '아래 매니페스트 JSON의 모든 블록 html을 위 규칙에 따라 다시 작성한 완성된 JSON만 출력하세요:',
    raw,
  ]
    .filter(Boolean)
    .join('\n\n');

  const text = await callLLM({ ...llm, system, user });
  const filled = extractJson(text) as typeof manifest & { pages: unknown[][] };

  if (!Array.isArray(filled.pages) || filled.pages.length !== manifest.pages.length) {
    throw new Error('AI 응답의 페이지 구조가 원본과 일치하지 않습니다. 다시 시도해 주세요.');
  }
  for (let i = 0; i < manifest.pages.length; i++) {
    if (filled.pages[i].length !== manifest.pages[i].length) {
      throw new Error(`AI 응답의 ${i + 1}페이지 블록 개수가 원본과 일치하지 않습니다. 다시 시도해 주세요.`);
    }
  }
  filled.standards = manifest.standards;
  filled.standardsText = manifest.standardsText;
  return filled;
}

function extractJson(text: string) {
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  return JSON.parse(t.slice(start, end + 1));
}

async function callLLM({
  provider,
  apiKey,
  model,
  baseUrl,
  system,
  user,
}: LlmConfig & { system: string; user: string }) {
  if (provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-5',
        max_tokens: 8000,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    const data = (await r.json()) as {
      error?: { message?: string };
      content?: Array<{ text?: string }>;
    };
    if (!r.ok) throw new Error(`Anthropic API 오류: ${data?.error?.message || r.status}`);
    return data.content?.[0]?.text || '';
  }

  if (provider === 'openai') {
    const endpointBase = assertSafeLlmBaseUrl(baseUrl);
    const r = await fetch(`${endpointBase}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'gpt-5.6-sol',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const data = (await r.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!r.ok) throw new Error(`OpenAI API 오류: ${data?.error?.message || r.status}`);
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error(`지원하지 않는 LLM 제공자: ${provider}`);
}

/** Custom baseUrl SSRF 완화: https만, localhost/사설망/메타데이터 차단. */
function assertSafeLlmBaseUrl(baseUrl?: string): string {
  const fallback = 'https://api.openai.com/v1';
  if (!baseUrl || !baseUrl.trim()) return fallback;

  let url: URL;
  try {
    url = new URL(baseUrl.trim());
  } catch {
    throw new Error('LLM Base URL 형식이 올바르지 않습니다.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('LLM Base URL은 https만 허용됩니다.');
  }

  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host === 'metadata.google.internal' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === '169.254.169.254'
  ) {
    throw new Error('LLM Base URL로 내부망·메타데이터 주소는 사용할 수 없습니다.');
  }

  return url.toString().replace(/\/$/, '');
}
