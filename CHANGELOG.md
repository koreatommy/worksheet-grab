# Changelog

이 저장소는 [pblsketch/worksheet-grab](https://github.com/pblsketch/worksheet-grab) 엔진을 로컬에서 사용하는 **래퍼·웹 대시보드·샘플** 프로젝트입니다.

## Engine pin

| 항목 | 값 |
|------|-----|
| Upstream | https://github.com/pblsketch/worksheet-grab |
| 검증된 커밋 | `090e24e` (`Merge pull request #9 from pblsketch/feat/pptx-math`) |
| 이 저장소의 엔진 소스 수정 | **없음** (upstream 그대로 클론해 사용) |

설치:

```bash
git clone https://github.com/pblsketch/worksheet-grab.git worksheet-grab
cd worksheet-grab && git checkout 090e24e
```

Upstream 참고(래퍼가 만든 변경 아님): PPTX/수식 렌더 개선, sketch mood 등 PR #8–#9 계열.

## [Unreleased] — 2026-09-05

### Added

- MIT `LICENSE` (이 저장소 래퍼·대시보드·샘플)
- React + TypeScript + Vite 웹 대시보드 (`web-dashboard/`)
- Express API (`web-dashboard/server/`) — 엔진 compose/assemble/validate + LLM 슬롯 채우기
- `.nvmrc` (Node 24), `.gitignore` (엔진 클론·`node_modules`·`dist`·`out` 제외)
- 엔진을 깨진 gitlink 대신 **로컬 클론 + gitignore** 모델로 정리

### Changed

- 바닐라 `public/` + `server.mjs` 제거 → Vite(3000) + API(3001, 개발) / 프로덕션 단일 포트
- OpenAI 호출에서 `temperature` 제거 (GPT-5 계열 호환)
- 성취기준 미리보기에 학년(`grade`) 전달 — 생성 파이프라인과 정렬
- API 기본 bind `127.0.0.1`, 커스텀 LLM `baseUrl` https/호스트 검증
- 결과 미리보기 iframe `sandbox` 적용

### Docs

- README: 상대 경로 설치, `worksheets/`(샘플) vs `web-dashboard/out/`(런타임) 구분, 엔진 핀·라이선스 고지

## Wrapper history (이전 브랜치 커밋 요약)

이 브랜치에 이미 포함된 작업(엔진 upstream 수정 아님):

1. 엔진 설치 안내 및 README
2. 샘플 활동지 HTML (`worksheets/` — 과학·수학·사회 등)
3. 웹 대시보드(초기): 아키타입 14종, LLM 저작 연동, 모델 드롭다운, 성취기준 실시간 미리보기, 단원 목록 선택, 학교급→교과 필터
