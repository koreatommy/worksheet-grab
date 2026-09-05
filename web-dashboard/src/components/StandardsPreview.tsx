import type { StandardItem, StandardsStatus } from '../types.ts';

type Props = {
  status: StandardsStatus;
  loading: boolean;
  topic: string;
  codesRaw: string;
  results: StandardItem[];
  selected: StandardItem[];
};

export function StandardsPreview({ status, loading, topic, codesRaw, results, selected }: Props) {
  if (loading) {
    return <div className="standards-preview loading">🔎 성취기준 조회 중...</div>;
  }

  if (codesRaw.trim() && selected.length === 0) {
    return (
      <div className="standards-preview found">
        ✅ 성취기준 코드 직접 지정: <b>{codesRaw}</b>
      </div>
    );
  }

  if (selected.length > 0) {
    return (
      <div className="standards-preview found">
        ✅ 선택한 성취기준 {selected.length}건:
        {selected.map((s) => (
          <div key={s.code} className="std-item">
            <b>{s.code}</b> {s.text.slice(0, 60)}
            {s.text.length > 60 ? '…' : ''}
          </div>
        ))}
      </div>
    );
  }

  if (status === false) {
    return (
      <div className="standards-preview empty">
        ❌ &quot;{topic}&quot;와 일치하는 성취기준을 찾지 못했습니다.
        <span className="tip">
          💡 오타를 확인하거나 더 짧은 핵심어로 시도해 보세요(예: &quot;자기소개&quot;, &quot;광합성&quot;). 특정
          성취기준을 이미 알고 있다면 아래 &quot;고급 설정&quot;에서 코드를 직접 입력하세요.
        </span>
      </div>
    );
  }

  if (status === true && results.length > 0) {
    return (
      <div className="standards-preview found">
        ✅ 성취기준 {results.length}건 찾음:
        {results.slice(0, 3).map((s) => (
          <div key={s.code} className="std-item">
            <b>{s.code}</b> {s.text.slice(0, 60)}
            {s.text.length > 60 ? '…' : ''}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
