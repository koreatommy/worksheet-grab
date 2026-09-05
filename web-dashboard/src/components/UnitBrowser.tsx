import type { ReactNode } from 'react';
import type { UnitGroup } from '../types.ts';

type Props = {
  groups: UnitGroup[];
  loading: boolean;
  selectedCodes: Set<string>;
  emptyHint?: string;
  onToggle: (code: string, text: string, checked: boolean) => void;
};

export function UnitBrowser({ groups, loading, selectedCodes, emptyHint, onToggle }: Props) {
  let body: ReactNode;
  if (loading) {
    body = <div className="unit-loading">🔎 단원 목록을 불러오는 중...</div>;
  } else if (groups.length === 0) {
    body = (
      <div className="unit-loading">
        {emptyHint ||
          '이 조합에 해당하는 성취기준이 없습니다. 학교급·학년·교과를 다시 확인하세요.'}
      </div>
    );
  } else {
    body = groups.map((g, gi) => (
      <details key={g.domain} className="unit-group" open={gi === 0}>
        <summary>
          영역 {g.domain} <span className="count">{g.count}개 성취기준</span>
        </summary>
        <div className="unit-items">
          {g.standards.map((s) => (
            <label key={s.code} className="unit-item">
              <input
                type="checkbox"
                checked={selectedCodes.has(s.code)}
                onChange={(e) => onToggle(s.code, s.text, e.target.checked)}
              />
              <span>
                <b>{s.code}</b>
                {s.text}
              </span>
            </label>
          ))}
        </div>
      </details>
    ));
  }

  return (
    <div className="unit-browser">
      <div className="unit-browser-header">
        📚 단원(성취기준)에서 선택{' '}
        <span className="hint-inline">— 고르면 주제·성취기준이 자동으로 채워집니다</span>
      </div>
      <div className="unit-groups">{body}</div>
    </div>
  );
}
