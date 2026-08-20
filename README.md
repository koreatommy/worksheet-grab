# worksheet-grab

한국 초·중·고 교사를 위한 로컬 AI 활동지 생성·편집·검수·내보내기 도구 (Beta).

저장소: [pblsketch/worksheet-grab](https://github.com/pblsketch/worksheet-grab)

## 설치 방법

### 사전 요구사항

- Node.js 24 이상
- Git

### 클론으로 설치

```bash
git clone https://github.com/pblsketch/worksheet-grab worksheet-grab
cd worksheet-grab
node bin/worksheet-grab.js help
```

`npm install`이나 별도 빌드 과정 없음.

### Node.js 24 설치 (nvm 사용)

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 24
nvm use 24
export PATH="$NVM_BIN:$PATH"
```

## 현재 설치 경로

`worksheet-grab` 저장소는 `/workspace/worksheet-grab`에 설치되어 있습니다.

```bash
cd /workspace/worksheet-grab
node bin/worksheet-grab.js help
```

## 주요 명령어

```bash
# 활동지 한 번에 생성
node bin/worksheet-grab.js pipeline 중2과학 광합성 --out out/

# HTML 초안만 생성 (Chrome 불필요)
node bin/worksheet-grab.js pipeline 중2사회 인구 --out out/ --no-render

# 브라우저 편집기 실행
node bin/worksheet-grab.js edit-ui <문서명>

# 업데이트 확인
node bin/worksheet-grab.js update --check
```
