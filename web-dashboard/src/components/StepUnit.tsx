import type { School, StandardItem, StandardsStatus, Subject } from '../types.ts';
import { StandardsPreview } from './StandardsPreview.tsx';
import { UnitBrowser } from './UnitBrowser.tsx';

type Props = {
  school: School;
  gradeNum: string;
  subject: string;
  topic: string;
  standardsCodes: string;
  subjects: Subject[];
  unitGroups: import('../types.ts').UnitGroup[];
  unitsLoading: boolean;
  selectedStandards: StandardItem[];
  standardsStatus: StandardsStatus;
  standardsLoading: boolean;
  searchResults: StandardItem[];
  onSchoolChange: (v: School) => void;
  onGradeChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onTopicChange: (v: string) => void;
  onStandardsCodesChange: (v: string) => void;
  onUnitToggle: (code: string, text: string, checked: boolean) => void;
  onNext: () => void;
};

export function StepUnit({
  school,
  gradeNum,
  subject,
  topic,
  standardsCodes,
  subjects,
  unitGroups,
  unitsLoading,
  selectedStandards,
  standardsStatus,
  standardsLoading,
  searchResults,
  onSchoolChange,
  onGradeChange,
  onSubjectChange,
  onTopicChange,
  onStandardsCodesChange,
  onUnitToggle,
  onNext,
}: Props) {
  const maxGrade = school === '초등학교' ? 6 : 3;
  const filtered = subjects.filter((s) => s.school.includes(school));
  const selectedCodes = new Set(selectedStandards.map((s) => s.code));
  const gradeN = Number(gradeNum);
  const emptyHint =
    school === '초등학교' &&
    (subject === '과학' || subject === '사회') &&
    gradeN >= 1 &&
    gradeN <= 2
      ? `초등 ${gradeN}학년 ${subject}는 교육과정 성취기준이 거의 없습니다(보통 3학년~). 학년을 올리거나 다른 교과를 선택하세요.`
      : undefined;

  return (
    <section className="panel">
      <h2>1. 어떤 단원의 활동지를 만들까요?</h2>
      <p className="hint">학교급·학년·교과를 고르면 2022 개정 교육과정 성취기준에서 자동으로 조회합니다.</p>

      <div className="form-grid">
        <label className="field">
          <span>학교급</span>
          <select value={school} onChange={(e) => onSchoolChange(e.target.value as School)}>
            <option value="초등학교">초등학교</option>
            <option value="중학교">중학교</option>
            <option value="고등학교">고등학교</option>
          </select>
        </label>
        <label className="field">
          <span>학년</span>
          <select value={gradeNum} onChange={(e) => onGradeChange(e.target.value)}>
            {Array.from({ length: maxGrade }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="field wide">
          <span>교과</span>
          <select value={subject} onChange={(e) => onSubjectChange(e.target.value)}>
            {filtered.map((s) => (
              <option key={s.key} value={s.key}>
                {s.key}
              </option>
            ))}
          </select>
        </label>
      </div>

      <UnitBrowser
        groups={unitGroups}
        loading={unitsLoading}
        selectedCodes={selectedCodes}
        emptyHint={emptyHint}
        onToggle={onUnitToggle}
      />

      <label className="field wide" style={{ marginTop: 14 }}>
        <span>주제(단원명) — 직접 입력해도 됩니다</span>
        <input
          type="text"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="예: 물질의 상태 변화, 조건부확률, 가계와 기업의 경제활동"
        />
      </label>

      <StandardsPreview
        status={standardsStatus}
        loading={standardsLoading}
        topic={topic}
        codesRaw={standardsCodes}
        results={searchResults}
        selected={selectedStandards}
      />

      <details className="advanced">
        <summary>고급 설정 — 성취기준 코드 직접 지정 (선택)</summary>
        <p className="hint">
          자동 조회가 원하는 성취기준을 못 찾을 때(예: 실과 단원을 사회로 대체) 코드를 직접 입력하세요. 쉼표로
          구분.
        </p>
        <input
          type="text"
          value={standardsCodes}
          onChange={(e) => onStandardsCodesChange(e.target.value)}
          placeholder="예: [6사06-01],[6사06-02]"
        />
      </details>

      <div className="btn-row">
        <button type="button" className="btn primary" onClick={onNext}>
          다음: 활동지 형식 선택 →
        </button>
      </div>
    </section>
  );
}
