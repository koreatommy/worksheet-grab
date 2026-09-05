import { MODEL_OPTIONS } from '../constants.ts';
import type { LlmProviderUi } from '../types.ts';

type Props = {
  provider: LlmProviderUi;
  model: string;
  modelCustom: string;
  baseUrl: string;
  apiKey: string;
  generating: boolean;
  progress: number;
  error: string | null;
  onProviderChange: (p: LlmProviderUi) => void;
  onModelChange: (v: string) => void;
  onModelCustomChange: (v: string) => void;
  onBaseUrlChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
  onBack: () => void;
  onGenerate: () => void;
};

const PROVIDERS: { id: LlmProviderUi; logo: string; name: string; sub: string }[] = [
  { id: 'anthropic', logo: '🅰️', name: 'Claude', sub: 'Anthropic' },
  { id: 'openai', logo: '🤖', name: 'GPT · Codex', sub: 'OpenAI' },
  { id: 'custom', logo: '🔧', name: '기타(호환 API)', sub: 'Custom Base URL' },
];

export function StepLlm({
  provider,
  model,
  modelCustom,
  baseUrl,
  apiKey,
  generating,
  progress,
  error,
  onProviderChange,
  onModelChange,
  onModelCustomChange,
  onBaseUrlChange,
  onApiKeyChange,
  onBack,
  onGenerate,
}: Props) {
  const isCustom = provider === 'custom';
  const options = !isCustom ? MODEL_OPTIONS[provider] : [];

  return (
    <section className="panel">
      <h2>3. 빈 슬롯을 채울 AI를 선택하세요</h2>
      <p className="hint">
        활동지의 <b>구조·성취기준</b>은 항상 결정적 엔진이 만듭니다. 여기서 고른 AI는{' '}
        <b>탐구 문제·예제·예시 답안</b> 같은 교육 내용을 채우는 데만 사용됩니다.
      </p>

      <div className="llm-grid">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`llm-card${provider === p.id ? ' selected' : ''}`}
            onClick={() => onProviderChange(p.id)}
          >
            <div className="llm-logo">{p.logo}</div>
            <div className="llm-name">
              {p.name}
              <span className="llm-sub">{p.sub}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="form-grid" style={{ marginTop: 16 }}>
        {!isCustom ? (
          <label className="field wide">
            <span>모델</span>
            <select value={model} onChange={(e) => onModelChange(e.target.value)}>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="field wide">
              <span>모델명 (직접 입력)</span>
              <input
                type="text"
                value={modelCustom}
                onChange={(e) => onModelCustomChange(e.target.value)}
                placeholder="model-name"
              />
            </label>
            <label className="field wide">
              <span>Base URL (호환 API용)</span>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => onBaseUrlChange(e.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </label>
          </>
        )}
        <label className="field wide">
          <span>API 키</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-ant-... 또는 sk-..."
          />
        </label>
      </div>
      <p className="note">
        🔒 API 키는 이 브라우저 세션에서만 사용되며, 서버는 요청 처리 중 메모리에만 두고 디스크·로그에 저장하지
        않습니다.
      </p>

      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={onBack} disabled={generating}>
          ← 이전
        </button>
        <button type="button" className="btn primary" onClick={onGenerate} disabled={generating}>
          🚀 활동지 생성하기
        </button>
      </div>

      {generating && (
        <div className="progress">
          <div className="spinner" />
          <div className="progress-steps">
            <div className={`pstep${progress === 1 ? ' active' : ''}${progress > 1 ? ' done' : ''}`}>
              ① 성취기준 조회 &amp; 형식 결정 (무API)
            </div>
            <div className={`pstep${progress === 2 ? ' active' : ''}${progress > 2 ? ' done' : ''}`}>
              ② AI가 빈 슬롯 저작 중...
            </div>
            <div className={`pstep${progress === 3 ? ' active' : ''}${progress > 3 ? ' done' : ''}`}>
              ③ 조립 &amp; 정답 누출 검수 (무API)
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-box">
          {error.includes('성취기준을 찾지 못했습니다') ? (
            <>
              ❌ 성취기준을 찾지 못했습니다.
              <div style={{ marginTop: 6, fontSize: 12 }}>
                💡 1단계로 돌아가 주제의 오타를 확인하거나, 더 일반적인 핵심어로 바꿔 보세요. (예: &quot;저기소개&quot;
                → &quot;자기소개&quot;, &quot;광합성 실험&quot; → &quot;광합성&quot;)
                <br />
                정확한 성취기준 코드를 알고 있다면 &quot;고급 설정&quot;에서 직접 입력할 수 있습니다.
              </div>
            </>
          ) : (
            <>❌ {error}</>
          )}
        </div>
      )}
    </section>
  );
}
