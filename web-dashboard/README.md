# worksheet-grab 웹 대시보드

[worksheet-grab](https://github.com/pblsketch/worksheet-grab) CLI를 감싸는 로컬 웹 UI입니다.
교사가 학년·교과·주제·아키타입(14종)을 웹 화면에서 고르고, 선택한 LLM(Claude / GPT·Codex / 호환 API)의
API 키를 입력해 빈 슬롯을 자동으로 채운 활동지를 생성·미리보기·다운로드할 수 있습니다.

## 설계 원칙

- **구조는 항상 결정적 엔진이 만듭니다.** 성취기준 조회, 아키타입 선택, 블록 조립, 정답 누출 검수는
  `worksheet-grab` CLI와 완전히 동일한 무API 엔진을 그대로 재사용합니다(`src/usecases/*` 직접 import).
- **LLM은 오직 "빈 슬롯 채우기"에만 사용됩니다.** compose 단계가 만든 스캐폴드(예시 콘텐츠 포함)를
  교사가 고른 LLM에게 보내 주제에 맞는 실제 교육 콘텐츠로 다시 쓰게 하고, 응답의 JSON 구조(페이지 수·
  블록 개수·id·성취기준 원문)가 원본과 같은지 검증합니다.
- **API 키는 저장하지 않습니다.** 요청 처리 중에만 서버 메모리에 존재하며 디스크·로그에 기록되지 않습니다.

## 설치 및 실행

이 폴더는 `worksheet-grab` 저장소의 `src/usecases/*`를 상대경로로 import하므로,
**worksheet-grab을 클론한 뒤 그 안의 `web/` 폴더로 복사(또는 `WSG_ROOT` 환경변수로 경로 지정)** 해야 합니다.

```bash
# 1) worksheet-grab 클론(아직 없다면)
git clone https://github.com/pblsketch/worksheet-grab
cd worksheet-grab

# 2) 이 폴더의 내용을 worksheet-grab/web/ 에 복사
cp -r <이 저장소>/web-dashboard/* web/

# 3) 의존성 설치 (express)
npm install express

# 4) 실행
PORT=4000 node web/server.mjs
# → http://localhost:4000
```

또는 `WSG_ROOT` 환경변수로 worksheet-grab 클론 경로를 직접 지정할 수 있습니다.

```bash
WSG_ROOT=/path/to/worksheet-grab PORT=4000 node server.mjs
```

## 사용 흐름 (교사용 4단계 마법사)

1. **단원** — 학교급·학년·교과·주제 입력 (필요 시 성취기준 코드 직접 지정)
2. **형식** — 14가지 아키타입 카드 중 선택, 또는 "자동 추천"
3. **AI 설정** — Claude / GPT·Codex / 호환 API 중 선택 + 모델명 + API 키 입력
4. **결과** — 학생용/교사용 미리보기(iframe) + 검수 결과 + 다운로드

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/subjects` | 지원 교과 목록 |
| GET | `/api/archetypes` | 아키타입 14종 목록(교과별 적용 가능 여부 포함) |
| GET | `/api/standards/search` | 성취기준 CSV 검색(미리보기용) |
| POST | `/api/generate` | 전체 파이프라인 실행(compose → LLM 저작 → assemble → 검수) |
| GET | `/api/result/:id/:variant` | 생성된 student/teacher HTML 서빙 |

## 제한 사항

- 이 프로토타입은 로컬 실행을 전제로 합니다(127.0.0.1). 외부 배포 시 인증·rate limit·HTTPS를 추가해야 합니다.
- LLM 응답이 페이지/블록 구조를 훼손하면 에러를 반환하고 재시도를 안내합니다(구조 무결성 검증).
- 생성 결과는 `web/out/<id>/`에 임시 저장됩니다. 영구 보관하려면 `doc save`로 워크스페이스에 옮기세요.
