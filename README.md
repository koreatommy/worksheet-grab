# worksheet-grab

한국 초·중·고 교사를 위한 로컬 AI 활동지 생성·편집·검수·내보내기 **래퍼** (Beta).

엔진 원본: [pblsketch/worksheet-grab](https://github.com/pblsketch/worksheet-grab) (MIT)  
이 저장소(대시보드·샘플·문서): **MIT** — [LICENSE](LICENSE)

변경·엔진 핀 기록: [CHANGELOG.md](CHANGELOG.md)

## 로컬 셋업

### 1. Node.js 24

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install   # .nvmrc → 24
nvm use
```

### 2. 엔진 클론 (최초 1회)

저장소 루트에서 엔진을 `worksheet-grab/`에 둡니다 (gitignore, 커밋되지 않음).

```bash
git clone https://github.com/pblsketch/worksheet-grab.git worksheet-grab
cd worksheet-grab && git checkout 090e24e && cd ..
```

권장 커밋: `090e24e` (자세한 내용 [CHANGELOG.md](CHANGELOG.md)).

### 3. 웹 대시보드 의존성

```bash
cd web-dashboard
npm install
```

## 사용 방법

### CLI (엔진)

```bash
cd worksheet-grab
node bin/worksheet-grab.js help
node bin/worksheet-grab.js pipeline 중2과학 광합성 --out out/ --no-render
```

### 웹 대시보드

```bash
cd web-dashboard
npm run dev          # 개발: UI http://localhost:3000 , API 127.0.0.1:3001 (/api 프록시)
npm run build && npm start   # 프로덕션: Express가 UI+API (기본 PORT=3000, HOST=127.0.0.1)
```

LAN에 API를 열려면 `HOST=0.0.0.0 npm start` (보안상 비권장).

## 폴더 구조

```
.
├── web-dashboard/   # React+TS 웹 UI + Express API (이 저장소)
├── worksheets/      # 샘플·데모 HTML (Git에 포함)
├── worksheet-grab/  # pblsketch 엔진 클론 (로컬 전용, gitignore)
├── CHANGELOG.md
└── LICENSE
```

- 대시보드 런타임 생성물: `web-dashboard/out/` (gitignore)
- CLI 출력: 엔진 디렉터리의 `out/` 등 (`--out` 옵션)

## 라이선스

- 이 저장소: MIT
- 엔진 upstream: MIT ([pblsketch/worksheet-grab](https://github.com/pblsketch/worksheet-grab)) — 별도 클론 시 원저작권 고지를 유지하세요.
