# worksheet-grab 웹 대시보드

[worksheet-grab](https://github.com/pblsketch/worksheet-grab) CLI를 감싸는 로컬 웹 UI입니다.
**React + TypeScript (Vite)** 프론트와 Express API로 구성됩니다.

교사가 학년·교과·주제·아키타입(14종)을 웹 화면에서 고르고, 선택한 LLM의 API 키로 빈 슬롯을 채워 활동지를 생성합니다.

## 설계 원칙

- **구조는 항상 결정적 엔진이 만듭니다.** 성취기준·아키타입·블록 조립·검수는 CLI와 동일한 엔진을 재사용합니다.
- **LLM은 빈 슬롯 채우기에만 사용됩니다.**
- **API 키는 저장하지 않습니다.** 요청 처리 중 메모리에만 존재합니다.

## 설치 및 실행

기본 엔진 경로: 저장소 루트의 `../worksheet-grab` (권장 커밋 `090e24e`).

```bash
# 저장소 루트에서 (최초 1회)
git clone https://github.com/pblsketch/worksheet-grab.git worksheet-grab
cd worksheet-grab && git checkout 090e24e && cd ..

cd web-dashboard
npm install
npm run dev
# → http://localhost:3000  (API는 127.0.0.1:3001, Vite가 /api 프록시)

npm run build && npm start
# → 프로덕션: http://127.0.0.1:3000
```

다른 경로의 엔진:

```bash
WSG_ROOT=/path/to/worksheet-grab npm run dev
```

## 폴더 구조

```
web-dashboard/
├── src/           # React + TypeScript UI
├── server/        # Express API (TypeScript)
├── index.html     # Vite 진입점
└── dist/          # 빌드 산출물 (gitignore)
```

## 라이선스

이 폴더는 상위 저장소와 동일하게 MIT입니다. 엔진 upstream도 MIT입니다.
