type Props = { step: number };

const LABELS = ['1. 단원', '2. 형식', '3. AI 설정', '4. 결과'] as const;

export function TopBar({ step }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        📝 worksheet-grab <span className="brand-sub">활동지 생성 대시보드</span>
      </div>
      <div className="steps">
        {LABELS.map((label, i) => (
          <span key={label} className={`step${step === i + 1 ? ' active' : ''}`}>
            {label}
          </span>
        ))}
      </div>
    </header>
  );
}
