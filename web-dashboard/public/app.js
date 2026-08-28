// worksheet-grab 웹 대시보드 — 클라이언트 로직.
// 서버(/api/*)와만 통신한다. API 키는 이 페이지 메모리에만 있고, 생성 요청 바디에
// 실려 서버로 전송된 뒤 서버가 즉시 LLM에 전달한다(디스크·로그 미저장).

// 2026-08 기준 최신 모델 목록(각 제공자 공식 문서 확인). 추천 모델을 최상단에 배치.
const MODEL_OPTIONS = {
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

const ARCH_ICON = {
  'experimental-inquiry': '🔬', 'data-interpretation': '📊', 'reading-comprehension': '📖',
  'discussion-decision': '💬', 'concept-structuring': '🧩', 'project-making': '🛠️',
  'vocabulary-concept': '🔤', 'kwl-inquiry': '🧠', 'writing-plan': '✍️',
  'concept-visual': '🎯', 'process-structure': '🔀', 'literary-response': '📚',
  'landscape-organizer': '🖼️', 'concept-example-practice': '➗',
};

const state = {
  step: 1,
  archetype: 'auto',
  llmProvider: 'anthropic',
  archetypes: [],
  result: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ── 초기 로드: 교과 목록 + 아키타입 목록 ──────────────────────────────
async function init() {
  const [subjectsRes, archRes] = await Promise.all([
    fetch('/api/subjects').then((r) => r.json()),
    fetch('/api/archetypes').then((r) => r.json()),
  ]);

  const subjectSelect = $('#subject');
  subjectSelect.innerHTML = subjectsRes.subjects.map((s) => `<option value="${s.key}">${s.key}</option>`).join('');

  state.archetypes = archRes.archetypes;
  renderArchetypeCards();

  subjectSelect.addEventListener('change', renderArchetypeCards);
  $('#school').addEventListener('change', updateGradeOptions);
  updateGradeOptions();
}

function updateGradeOptions() {
  const school = $('#school').value;
  const max = school === '초등학교' ? 6 : 3;
  const gradeSelect = $('#gradeNum');
  const current = gradeSelect.value;
  gradeSelect.innerHTML = Array.from({ length: max }, (_, i) => i + 1)
    .map((n) => `<option value="${n}">${n}</option>`).join('');
  if (Number(current) <= max) gradeSelect.value = current;
}

function renderArchetypeCards() {
  const grid = $('#archetypeGrid');
  const subject = $('#subject').value;
  const subjectMap = { 과학: 'science', 통합과학: 'science', 국어: 'korean', '독서와 작문': 'korean',
    사회: 'social', 역사: 'social', 영어: 'english' };
  const isMath = !['과학', '통합과학', '국어', '독서와 작문', '사회', '역사', '영어'].includes(subject);
  const subjectKey = isMath ? 'math' : (subjectMap[subject] || subject);

  const cards = state.archetypes.map((a) => {
    const applicable = a.subjectsResolved.includes(subjectKey) || a.subjects.includes('*');
    const icon = ARCH_ICON[a.id] || '📋';
    return `
      <div class="arch-card ${applicable ? '' : 'disabled'} ${state.archetype === a.id ? 'selected' : ''}"
           data-id="${a.id}" ${applicable ? '' : 'title="현재 교과에는 적용되지 않습니다"'}>
        <div class="arch-icon">${icon}</div>
        <div class="arch-name">${a.name}</div>
        <div class="arch-desc">${a.desc}</div>
        <div class="arch-meta">${a.pages}쪽 · ${a.blocks}블록</div>
      </div>`;
  }).join('');

  // 자동 추천 카드는 항상 유지 + 나머지 갱신
  grid.innerHTML = `
    <div class="arch-card auto ${state.archetype === 'auto' ? 'selected' : ''}" data-id="auto">
      <div class="arch-icon">✨</div>
      <div class="arch-name">자동 추천</div>
      <div class="arch-desc">주제·교과를 분석해 가장 적합한 형식을 엔진이 결정적으로 골라줍니다.</div>
    </div>
    ${cards}`;

  grid.querySelectorAll('.arch-card:not(.disabled)').forEach((card) => {
    card.addEventListener('click', () => {
      state.archetype = card.dataset.id;
      grid.querySelectorAll('.arch-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}

// ── 스텝 네비게이션 ──────────────────────────────────────────────────
function goToStep(n) {
  state.step = n;
  [1, 2, 3, 4].forEach((i) => {
    $(`#panel-${i}`).classList.toggle('hidden', i !== n);
  });
  $$('.step').forEach((el) => el.classList.toggle('active', Number(el.dataset.step) === n));
}

$('#toStep2').addEventListener('click', () => {
  if (!$('#topic').value.trim()) { alert('주제(단원명)를 입력해 주세요.'); return; }
  goToStep(2);
});
$('#backTo1').addEventListener('click', () => goToStep(1));
$('#toStep3').addEventListener('click', () => goToStep(3));
$('#backTo2').addEventListener('click', () => goToStep(2));
$('#backToStart').addEventListener('click', () => goToStep(1));

// ── LLM 카드 선택 ────────────────────────────────────────────────────
$$('.llm-card').forEach((card) => {
  card.addEventListener('click', () => {
    $$('.llm-card').forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    state.llmProvider = card.dataset.provider;
    updateModelField();
  });
});

// 제공자에 따라 "모델 선택" 드롭다운 ↔ "모델명 직접 입력" 텍스트 필드를 전환.
// custom(호환 API)은 어떤 모델명을 쓸지 알 수 없으므로 직접 입력만 제공한다.
function updateModelField() {
  const isCustom = state.llmProvider === 'custom';
  $('#modelFieldSelect').classList.toggle('hidden', isCustom);
  $('#modelFieldCustom').classList.toggle('hidden', !isCustom);
  $('#baseUrlField').classList.toggle('hidden', !isCustom);

  if (!isCustom) {
    const options = MODEL_OPTIONS[state.llmProvider] || [];
    $('#llmModel').innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
  }
}
updateModelField();

// ── 생성 요청 ────────────────────────────────────────────────────────
$('#generateBtn').addEventListener('click', async () => {
  const apiKey = $('#llmApiKey').value.trim();
  if (!apiKey) { alert('API 키를 입력해 주세요.'); return; }

  const school = $('#school').value;
  const gradeNum = $('#gradeNum').value;
  const gradePrefix = { 초등학교: '초', 중학교: '중', 고등학교: '고' }[school];
  const grade = `${gradePrefix}${gradeNum}`;
  const subject = $('#subject').value;
  const topic = $('#topic').value.trim();
  const codesRaw = $('#standardsCodes').value.trim();
  const standards = codesRaw ? codesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const body = {
    school, grade, subject, topic,
    archetype: state.archetype,
    standards,
    llm: {
      provider: state.llmProvider === 'custom' ? 'openai' : state.llmProvider,
      apiKey,
      model: (state.llmProvider === 'custom' ? $('#llmModelCustom').value.trim() : $('#llmModel').value) || undefined,
      baseUrl: state.llmProvider === 'custom' ? ($('#llmBaseUrl').value.trim() || undefined) : undefined,
    },
  };

  $('#errorBox').classList.add('hidden');
  $('#progressBox').classList.remove('hidden');
  $('#generateBtn').disabled = true;
  setProgress(1);
  setTimeout(() => setProgress(2), 600);

  try {
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setProgress(3);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || '생성에 실패했습니다.');

    state.result = data;
    showResult(data);
    goToStep(4);
  } catch (e) {
    $('#errorBox').textContent = '❌ ' + e.message;
    $('#errorBox').classList.remove('hidden');
  } finally {
    $('#progressBox').classList.add('hidden');
    $('#generateBtn').disabled = false;
    resetProgress();
  }
});

function setProgress(n) {
  $$('.pstep').forEach((el) => {
    const p = Number(el.dataset.p);
    el.classList.toggle('active', p === n);
    el.classList.toggle('done', p < n);
  });
}
function resetProgress() { $$('.pstep').forEach((el) => el.classList.remove('active', 'done')); }

// ── 결과 표시 ────────────────────────────────────────────────────────
function showResult(data) {
  $('#resultMeta').innerHTML = `
    <b>${data.topic}</b> · 아키타입: <b>${data.archetype}</b>(${escapeHtml(data.archetypeReason)}) ·
    ${data.pageCount}쪽 · 성취기준 ${data.standards.map((s) => s.code).join(', ')}`;

  const gate = data.gate;
  const pill = (variant, ok, count) => `<span class="gate-pill ${ok ? 'ok' : (count > 0 ? 'warn' : 'ok')}">
    ${variant === 'student' ? '학생용' : '교사용'} ${ok ? '✔ 검수 통과' : `⚠ 경고 ${count}건`}</span>`;
  $('#gateSummary').innerHTML =
    pill('student', gate.student.ok, gate.student.findings.length) +
    pill('teacher', gate.teacher.ok, gate.teacher.findings.length);

  loadTab('student');
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === 'student'));
}

$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    loadTab(tab.dataset.tab);
  });
});

function loadTab(variant) {
  if (!state.result) return;
  const url = state.result.urls[variant];
  $('#previewFrame').src = url;
  $('#downloadCurrent').href = url;
  $('#downloadCurrent').setAttribute('download', `${state.result.topic}-${variant}.html`);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

init();
