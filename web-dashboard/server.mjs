import express from 'express';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

import { FsBlockRepository } from '../src/adapters/FsBlockRepository.js';
import { GepaiCurriculum } from '../src/adapters/GepaiCurriculum.js';
import { ComposeWorksheet } from '../src/usecases/ComposeWorksheet.js';
import { AssembleWorksheet } from '../src/usecases/AssembleWorksheet.js';
import { BuildVariants } from '../src/usecases/BuildVariants.js';
import { ValidateWorksheet } from '../src/usecases/ValidateWorksheet.js';
import { ArchetypeLibrary } from '../src/usecases/ArchetypeLibrary.js';
import { loadKnownSubjectHexes } from '../src/usecases/renderAssets.js';

// ─────────────────────────────────────────────────────────────────────────
// worksheet-grab 웹 대시보드 — CLI(compose 파이프라인)를 감싸는 로컬 웹 서버.
// 무API 원칙은 엔진(조립·검수)에는 그대로 유지된다 — 유일하게 LLM을 호출하는 지점은
// "AI 저작 단계"(빈 슬롯 채우기)뿐이며, 성취기준 원문·구조·아키타입은 결정적 엔진이 만든다.
// API 키는 요청 처리 중에만 메모리에 존재하고 디스크·로그에 절대 기록하지 않는다.
// ─────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
// worksheet-grab 저장소 루트. 이 파일이 <worksheet-grab>/web/server.mjs 로 배치되면
// 기본값(상위 폴더)으로 충분하고, 다른 위치에 두었다면 WSG_ROOT 환경변수로 지정한다.
const ROOT = process.env.WSG_ROOT ? resolve(process.env.WSG_ROOT) : resolve(__dirname, '..');
const OUT_DIR = join(__dirname, 'out');          // 생성 결과 저장 위치(웹 전용, out/ 과 분리)

const repo = new FsBlockRepository({ root: ROOT });
const curriculum = new GepaiCurriculum({});

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(join(__dirname, 'public')));

// ── 1) 아키타입 목록 ────────────────────────────────────────────────────
app.get('/api/archetypes', async (req, res) => {
  try {
    const [archetypes, vocabulary] = await Promise.all([repo.readArchetypes(), repo.readVocabulary()]);
    const lib = new ArchetypeLibrary({ archetypes, vocabulary });
    const items = lib.list().map((a) => ({
      ...a,
      subjectsResolved: lib.subjectsFor(a.id),
    }));
    res.json({ archetypes: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 2) 지원 교과 목록(고정 — GenerateWorksheet.SUBJECT_REGISTRY 와 동기화) ──
app.get('/api/subjects', (req, res) => {
  res.json({
    subjects: [
      { key: '과학', school: ['초등학교', '중학교', '고등학교'] },
      { key: '통합과학', school: ['고등학교'] },
      { key: '국어', school: ['초등학교', '중학교', '고등학교'] },
      { key: '독서와 작문', school: ['고등학교'] },
      { key: '사회', school: ['초등학교', '중학교', '고등학교'] },
      { key: '역사', school: ['중학교', '고등학교'] },
      { key: '영어', school: ['초등학교', '중학교', '고등학교'] },
      { key: '수학', school: ['초등학교', '중학교'] },
      { key: '공통수학1', school: ['고등학교'] },
      { key: '공통수학2', school: ['고등학교'] },
      { key: '대수', school: ['고등학교'] },
      { key: '미적분Ⅰ', school: ['고등학교'] },
      { key: '미적분Ⅱ', school: ['고등학교'] },
      { key: '확률과 통계', school: ['고등학교'] },
      { key: '기하', school: ['고등학교'] },
      { key: '경제 수학', school: ['고등학교'] },
    ],
  });
});

// ── 3) 성취기준 검색(미리보기 — 선택 사항, 프론트에서 자동조회 확인용) ──
app.get('/api/standards/search', async (req, res) => {
  try {
    const { school, subject, grade, keyword, limit } = req.query;
    const results = await curriculum.search({
      school: school || undefined,
      subject: subject || undefined,
      grade: grade || undefined,
      keyword: keyword || undefined,
      limit: limit ? Number(limit) : 10,
    });
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 4) 활동지 생성(핵심 파이프라인) ─────────────────────────────────────
// 흐름: compose(결정적 구조) → LLM 저작(빈 슬롯 채움) → assemble → buildVariants → validate
app.post('/api/generate', async (req, res) => {
  const {
    school, grade, subject, topic, archetype, standards, objectives,
    llm, // { provider, apiKey, model, baseUrl? }
  } = req.body || {};

  try {
    if (!subject || !topic) throw new Error('교과와 주제는 필수입니다.');
    if (!grade) throw new Error('학년(예: 초6, 중2, 고1)은 필수입니다.');
    if (!llm || !llm.apiKey || !llm.provider) throw new Error('LLM 제공자와 API 키가 필요합니다.');

    const codes = Array.isArray(standards) && standards.length > 0 ? standards : null;

    // 1) 결정적 구조 생성(무API) — 성취기준 조회 + 아키타입 선택 + 빈 슬롯 스캐폴드.
    const compose = new ComposeWorksheet({ blockRepository: repo, curriculum });
    const composed = await compose.execute({
      grade,
      subject,
      topic,
      archetype: archetype && archetype !== 'auto' ? archetype : null,
      codes,
      limit: 6,
      objectives: Array.isArray(objectives) ? objectives : [],
    });

    // 2) LLM 저작 — 빈 슬롯(［…］)만 교체. 구조·성취기준·id는 절대 건드리지 않도록 지시.
    const filledManifest = await fillManifestWithLLM({
      manifest: composed.manifest,
      brief: composed.brief,
      topic, school, grade, subject,
      llm,
    });

    // 3) 조립(무API, 결정적) → HTML.
    const asm = new AssembleWorksheet({ blockRepository: repo, curriculum });
    const { html, worksheet } = await asm.execute(filledManifest);
    const { student, teacher } = new BuildVariants().execute(html);

    // 4) 안전 검수(무API, 결정적) — 정답 누출·하드코딩색·최소폰트.
    const knownHexes = await loadKnownSubjectHexes(repo);
    const validator = new ValidateWorksheet({ knownSubjectHexes: knownHexes });
    const studentCheck = validator.execute(student);
    const teacherCheck = validator.execute(teacher);

    // 5) 저장.
    const id = `${Date.now()}-${randomBytes(3).toString('hex')}`;
    const dir = join(OUT_DIR, id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(filledManifest, null, 2), 'utf8');
    await writeFile(join(dir, 'student.html'), student, 'utf8');
    await writeFile(join(dir, 'teacher.html'), teacher, 'utf8');

    res.json({
      id,
      topic,
      archetype: composed.archetype,
      archetypeReason: composed.archetypeReason,
      standards: composed.standards.map((s) => ({ code: s.code, text: s.text })),
      pageCount: worksheet.pageCount(),
      gate: {
        student: { ok: studentCheck.ok, findings: studentCheck.findings },
        teacher: { ok: teacherCheck.ok, findings: teacherCheck.findings },
      },
      urls: { student: `/api/result/${id}/student`, teacher: `/api/result/${id}/teacher` },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── 5) 결과 서빙 ────────────────────────────────────────────────────────
app.get('/api/result/:id/:variant', async (req, res) => {
  const { id, variant } = req.params;
  if (!/^[\w-]+$/.test(id) || !['student', 'teacher'].includes(variant)) {
    return res.status(400).send('잘못된 요청');
  }
  const file = join(OUT_DIR, id, `${variant}.html`);
  if (!existsSync(file)) return res.status(404).send('결과를 찾을 수 없습니다.');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(await readFile(file, 'utf8'));
});

// ─────────────────────────────────────────────────────────────────────────
// LLM 저작 — manifest(placeholder 포함 JSON)를 통째로 LLM에 보내 빈 슬롯만 채우게 한다.
// 구조 변형을 막기 위해 "키·구조·성취기준 원문은 절대 변경 금지, ［…］ 자리표시만 교체"를
// 강하게 지시하고, 응답 JSON의 페이지·블록 개수가 원본과 같은지 검증한다.
// ─────────────────────────────────────────────────────────────────────────
async function fillManifestWithLLM({ manifest, brief, topic, school, grade, subject, llm }) {
  const raw = JSON.stringify(manifest);

  // compose 산출물은 "다른 주제의 예시(exemplar) 콘텐츠"가 이미 채워진 스캐폴드다(［…슬롯］
  // 마커가 아니라 실제 문장). 그래서 존재 여부로 LLM 호출을 건너뛰면 예시 문구가 그대로
  // 새 주제의 활동지에 남는다 — 슬롯 유무와 무관하게 항상 저작을 요청해야 한다.
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
    '7. 결과는 오직 완전한 JSON 객체만 출력하세요. 설명, 마크다운 코드펜스(```), 주석을 포함하지 마세요.',
  ].join('\n');

  const user = [
    `학교급: ${school || '(미지정)'}  학년: ${grade || '(미지정)'}  교과: ${subject}  주제: ${topic}`,
    brief ? `저작 가이드(참고용, 출력하지 마세요 — 각 블록이 무엇을 담아야 하는지 안내): ${JSON.stringify(brief).slice(0, 4000)}` : '',
    '아래 매니페스트 JSON의 모든 블록 html을 위 규칙에 따라 다시 작성한 완성된 JSON만 출력하세요:',
    raw,
  ].filter(Boolean).join('\n\n');

  const text = await callLLM({ ...llm, system, user });
  const filled = extractJson(text);

  // 구조 무결성 검증 — 페이지 수·블록 수가 원본과 다르면 LLM이 구조를 훼손했다고 판단.
  if (!Array.isArray(filled.pages) || filled.pages.length !== manifest.pages.length) {
    throw new Error('AI 응답의 페이지 구조가 원본과 일치하지 않습니다. 다시 시도해 주세요.');
  }
  for (let i = 0; i < manifest.pages.length; i++) {
    if (filled.pages[i].length !== manifest.pages[i].length) {
      throw new Error(`AI 응답의 ${i + 1}페이지 블록 개수가 원본과 일치하지 않습니다. 다시 시도해 주세요.`);
    }
  }
  // 성취기준 원문은 서버가 조회한 원문으로 강제 고정(창작 금지 원칙 — LLM 왜곡 방지).
  filled.standards = manifest.standards;
  filled.standardsText = manifest.standardsText;
  return filled;
}

function extractJson(text) {
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  return JSON.parse(t.slice(start, end + 1));
}

async function callLLM({ provider, apiKey, model, baseUrl, system, user }) {
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
    const data = await r.json();
    if (!r.ok) throw new Error(`Anthropic API 오류: ${data?.error?.message || r.status}`);
    return data.content?.[0]?.text || '';
  }

  if (provider === 'openai') {
    const r = await fetch(`${baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'gpt-5.6-sol',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.7,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`OpenAI API 오류: ${data?.error?.message || r.status}`);
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error(`지원하지 않는 LLM 제공자: ${provider}`);
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✔ worksheet-grab 웹 대시보드 → http://0.0.0.0:${PORT}/`);
});
