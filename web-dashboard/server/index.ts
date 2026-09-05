import { createApp } from './createApp.ts';
import { IS_PROD, PORT } from './config.ts';

const HOST = process.env.HOST || '127.0.0.1';
const app = createApp();
app.listen(PORT, HOST, () => {
  const label = IS_PROD ? `http://${HOST}:${PORT}/` : `API http://${HOST}:${PORT}/api`;
  console.log(`✔ worksheet-grab 웹 대시보드 → ${label}`);
  if (HOST === '0.0.0.0') {
    console.warn('⚠ HOST=0.0.0.0 — LAN에 API가 노출됩니다. 로컬 전용은 HOST=127.0.0.1 을 쓰세요.');
  }
});
