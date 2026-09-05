import { ARCH_ICON, subjectKeyOf } from '../constants.ts';
import type { Archetype } from '../types.ts';

type Props = {
  subject: string;
  archetypes: Archetype[];
  selected: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepArchetype({ subject, archetypes, selected, onSelect, onBack, onNext }: Props) {
  const subjectKey = subjectKeyOf(subject);

  return (
    <section className="panel">
      <h2>2. 어떤 형식의 활동지로 만들까요?</h2>
      <p className="hint">
        같은 단원도 형식(아키타입)에 따라 완전히 다른 수업 활동지가 됩니다. 잘 모르겠으면 <b>자동 추천</b>을
        선택하세요.
      </p>

      <div className="archetype-grid">
        <button
          type="button"
          className={`arch-card auto${selected === 'auto' ? ' selected' : ''}`}
          onClick={() => onSelect('auto')}
        >
          <div className="arch-icon">✨</div>
          <div className="arch-name">자동 추천</div>
          <div className="arch-desc">
            주제·교과를 분석해 가장 적합한 형식을 엔진이 결정적으로 골라줍니다.
          </div>
        </button>

        {archetypes.map((a) => {
          const applicable = a.subjectsResolved.includes(subjectKey) || a.subjects.includes('*');
          return (
            <button
              key={a.id}
              type="button"
              className={`arch-card${applicable ? '' : ' disabled'}${selected === a.id ? ' selected' : ''}`}
              disabled={!applicable}
              title={applicable ? undefined : '현재 교과에는 적용되지 않습니다'}
              onClick={() => applicable && onSelect(a.id)}
            >
              <div className="arch-icon">{ARCH_ICON[a.id] || '📋'}</div>
              <div className="arch-name">{a.name}</div>
              <div className="arch-desc">{a.desc}</div>
              <div className="arch-meta">
                {a.pages}쪽 · {a.blocks}블록
              </div>
            </button>
          );
        })}
      </div>

      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← 이전
        </button>
        <button type="button" className="btn primary" onClick={onNext}>
          다음: AI 설정 →
        </button>
      </div>
    </section>
  );
}
