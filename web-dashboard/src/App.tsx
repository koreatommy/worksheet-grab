import { useEffect, useState } from 'react';
import {
  fetchArchetypes,
  fetchSubjects,
  fetchUnits,
  generateWorksheet,
  searchStandards,
} from './api.ts';
import { StepArchetype } from './components/StepArchetype.tsx';
import { StepLlm } from './components/StepLlm.tsx';
import { StepResult } from './components/StepResult.tsx';
import { StepUnit } from './components/StepUnit.tsx';
import { TopBar } from './components/TopBar.tsx';
import { MODEL_OPTIONS, gradeLabel } from './constants.ts';
import { useDebouncedEffect } from './hooks/useDebouncedEffect.ts';
import type {
  Archetype,
  GenerateResult,
  LlmProviderUi,
  School,
  StandardItem,
  StandardsStatus,
  Subject,
  UnitGroup,
} from './types.ts';

export default function App() {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);

  const [school, setSchool] = useState<School>('초등학교');
  const [gradeNum, setGradeNum] = useState('1');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [autoFilledTopic, setAutoFilledTopic] = useState('');
  const [standardsCodes, setStandardsCodes] = useState('');
  const [selectedStandards, setSelectedStandards] = useState<StandardItem[]>([]);

  const [unitGroups, setUnitGroups] = useState<UnitGroup[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [standardsStatus, setStandardsStatus] = useState<StandardsStatus>(null);
  const [standardsLoading, setStandardsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<StandardItem[]>([]);

  const [archetype, setArchetype] = useState('auto');
  const [provider, setProvider] = useState<LlmProviderUi>('anthropic');
  const [model, setModel] = useState(MODEL_OPTIONS.anthropic[0].value);
  const [modelCustom, setModelCustom] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  useEffect(() => {
    void (async () => {
      const [subRes, archRes] = await Promise.all([fetchSubjects(), fetchArchetypes()]);
      setSubjects(subRes.subjects);
      setArchetypes(archRes.archetypes);
      const filtered = subRes.subjects.filter((s) => s.school.includes('초등학교'));
      if (filtered[0]) setSubject(filtered[0].key);
    })();
  }, []);

  useEffect(() => {
    const max = school === '초등학교' ? 6 : 3;
    if (Number(gradeNum) > max) setGradeNum('1');
    const filtered = subjects.filter((s) => s.school.includes(school));
    if (filtered.length && !filtered.some((s) => s.key === subject)) {
      setSubject(filtered[0].key);
    }
  }, [school, subjects, gradeNum, subject]);

  useDebouncedEffect(
    () => {
      if (!subject) return;
      void (async () => {
        setUnitsLoading(true);
        try {
          const data = await fetchUnits({ school, subject, grade: gradeNum });
          setUnitGroups(data.groups);
        } catch {
          setUnitGroups([]);
        } finally {
          setUnitsLoading(false);
        }
      })();
    },
    [school, subject, gradeNum],
    150,
  );

  useDebouncedEffect(
    () => {
      void (async () => {
        if (standardsCodes.trim()) {
          setStandardsStatus(true);
          setStandardsLoading(false);
          return;
        }
        if (!topic.trim()) {
          setStandardsStatus(null);
          setSearchResults([]);
          setStandardsLoading(false);
          return;
        }
        setStandardsLoading(true);
        try {
          const data = await searchStandards({
            school,
            subject,
            keyword: topic.trim(),
            grade: gradeNum,
            limit: 5,
          });
          setSearchResults(data.results);
          setStandardsStatus(data.results.length > 0);
        } catch {
          setStandardsStatus(null);
          setSearchResults([]);
        } finally {
          setStandardsLoading(false);
        }
      })();
    },
    [topic, school, subject, gradeNum, standardsCodes],
    450,
  );

  function handleSchoolChange(v: School) {
    setSchool(v);
    setSelectedStandards([]);
    setStandardsCodes('');
  }

  function handleUnitToggle(code: string, text: string, checked: boolean) {
    setSelectedStandards((prev) => {
      const next = checked
        ? [...prev.filter((s) => s.code !== code), { code, text }]
        : prev.filter((s) => s.code !== code);
      setStandardsCodes(next.map((s) => s.code).join(','));
      if (next.length === 0) {
        setStandardsStatus(null);
      } else {
        setStandardsStatus(true);
        if (!topic.trim() || topic === autoFilledTopic) {
          const suggested = next[0].text.split(/[.,]/)[0].slice(0, 24);
          setTopic(suggested);
          setAutoFilledTopic(suggested);
        }
      }
      return next;
    });
  }

  function handleTopicChange(v: string) {
    setTopic(v);
  }

  function handleStandardsCodesChange(v: string) {
    setStandardsCodes(v);
    if (!v.trim()) setSelectedStandards([]);
  }

  function handleProviderChange(p: LlmProviderUi) {
    setProvider(p);
    if (p !== 'custom') setModel(MODEL_OPTIONS[p][0].value);
  }

  async function handleNextFromUnit() {
    if (!topic.trim()) {
      alert('주제(단원명)를 입력해 주세요.');
      return;
    }
    if (standardsStatus === false) {
      const proceed = confirm(
        '이 주제와 일치하는 성취기준을 찾지 못했습니다.\n' +
          '이대로 진행하면 "활동지 생성" 단계에서 실패합니다.\n\n' +
          '그래도 계속 진행할까요? (권장: 취소 후 주제를 수정하거나 고급 설정에서 성취기준 코드를 직접 입력하세요)',
      );
      if (!proceed) return;
    }
    setStep(2);
  }

  async function handleGenerate() {
    if (!apiKey.trim()) {
      alert('API 키를 입력해 주세요.');
      return;
    }
    const codes = standardsCodes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setError(null);
    setGenerating(true);
    setProgress(1);
    const t = window.setTimeout(() => setProgress(2), 600);

    try {
      const data = await generateWorksheet({
        school,
        grade: gradeLabel(school, gradeNum),
        subject,
        topic: topic.trim(),
        archetype,
        standards: codes,
        llm: {
          provider: provider === 'custom' ? 'openai' : provider,
          apiKey: apiKey.trim(),
          model: (provider === 'custom' ? modelCustom.trim() : model) || undefined,
          baseUrl: provider === 'custom' ? baseUrl.trim() || undefined : undefined,
        },
      });
      setProgress(3);
      setResult(data);
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      window.clearTimeout(t);
      setGenerating(false);
      setProgress(1);
    }
  }

  function handleRestart() {
    setStep(1);
    setResult(null);
    setError(null);
  }

  return (
    <>
      <TopBar step={step} />
      <main className="wrap">
        {step === 1 && (
          <StepUnit
            school={school}
            gradeNum={gradeNum}
            subject={subject}
            topic={topic}
            standardsCodes={standardsCodes}
            subjects={subjects}
            unitGroups={unitGroups}
            unitsLoading={unitsLoading}
            selectedStandards={selectedStandards}
            standardsStatus={standardsStatus}
            standardsLoading={standardsLoading}
            searchResults={searchResults}
            onSchoolChange={handleSchoolChange}
            onGradeChange={setGradeNum}
            onSubjectChange={setSubject}
            onTopicChange={handleTopicChange}
            onStandardsCodesChange={handleStandardsCodesChange}
            onUnitToggle={handleUnitToggle}
            onNext={() => void handleNextFromUnit()}
          />
        )}
        {step === 2 && (
          <StepArchetype
            subject={subject}
            archetypes={archetypes}
            selected={archetype}
            onSelect={setArchetype}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepLlm
            provider={provider}
            model={model}
            modelCustom={modelCustom}
            baseUrl={baseUrl}
            apiKey={apiKey}
            generating={generating}
            progress={progress}
            error={error}
            onProviderChange={handleProviderChange}
            onModelChange={setModel}
            onModelCustomChange={setModelCustom}
            onBaseUrlChange={setBaseUrl}
            onApiKeyChange={setApiKey}
            onBack={() => setStep(2)}
            onGenerate={() => void handleGenerate()}
          />
        )}
        {step === 4 && result && <StepResult result={result} onRestart={handleRestart} />}
      </main>
    </>
  );
}
