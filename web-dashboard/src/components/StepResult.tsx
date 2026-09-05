import { useState } from 'react';
import type { GenerateResult } from '../types.ts';

type Props = {
  result: GenerateResult;
  onRestart: () => void;
};

export function StepResult({ result, onRestart }: Props) {
  const [tab, setTab] = useState<'student' | 'teacher'>('student');
  const url = result.urls[tab];

  const pill = (variant: 'student' | 'teacher') => {
    const g = result.gate[variant];
    const ok = g.ok;
    const count = g.findings.length;
    return (
      <span className={`gate-pill ${ok ? 'ok' : count > 0 ? 'warn' : 'ok'}`}>
        {variant === 'student' ? '학생용' : '교사용'}{' '}
        {ok ? '✔ 검수 통과' : `⚠ 경고 ${count}건`}
      </span>
    );
  };

  return (
    <section className="panel">
      <h2>4. 완성된 활동지</h2>

      <div className="result-meta">
        <b>{result.topic}</b> · 아키타입: <b>{result.archetype}</b>({result.archetypeReason}) ·{' '}
        {result.pageCount}쪽 · 성취기준 {result.standards.map((s) => s.code).join(', ')}
      </div>

      <div className="gate-summary">
        {pill('student')}
        {pill('teacher')}
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab${tab === 'student' ? ' active' : ''}`}
          onClick={() => setTab('student')}
        >
          👦 학생용
        </button>
        <button
          type="button"
          className={`tab${tab === 'teacher' ? ' active' : ''}`}
          onClick={() => setTab('teacher')}
        >
          👩‍🏫 교사용
        </button>
      </div>

      <div className="preview-frame">
        <iframe
          title="활동지 미리보기"
          src={url}
          sandbox="allow-scripts allow-popups allow-forms"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={onRestart}>
          🔄 새 활동지 만들기
        </button>
        <a className="btn primary" href={url} download={`${result.topic}-${tab}.html`}>
          ⬇ 현재 탭 다운로드
        </a>
      </div>
    </section>
  );
}
