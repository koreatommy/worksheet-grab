import express from 'express';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

/* worksheet-grab 엔진은 plain JS — 타입 선언 없이 런타임 import */
// @ts-expect-error plain JS engine
import { FsBlockRepository } from '../../worksheet-grab/src/adapters/FsBlockRepository.js';
// @ts-expect-error plain JS engine
import { GepaiCurriculum } from '../../worksheet-grab/src/adapters/GepaiCurriculum.js';
// @ts-expect-error plain JS engine
import { ComposeWorksheet } from '../../worksheet-grab/src/usecases/ComposeWorksheet.js';
// @ts-expect-error plain JS engine
import { AssembleWorksheet } from '../../worksheet-grab/src/usecases/AssembleWorksheet.js';
// @ts-expect-error plain JS engine
import { BuildVariants } from '../../worksheet-grab/src/usecases/BuildVariants.js';
// @ts-expect-error plain JS engine
import { ValidateWorksheet } from '../../worksheet-grab/src/usecases/ValidateWorksheet.js';
// @ts-expect-error plain JS engine
import { ArchetypeLibrary } from '../../worksheet-grab/src/usecases/ArchetypeLibrary.js';
// @ts-expect-error plain JS engine
import { loadKnownSubjectHexes } from '../../worksheet-grab/src/usecases/renderAssets.js';

import { DIST_DIR, IS_PROD, OUT_DIR, ROOT } from './config.ts';
import { groupByDomain } from './groupByDomain.ts';
import { fillManifestWithLLM } from './llm.ts';

const SUBJECTS = [
  { key: '과학', school: ['초등학교', '중학교', '고등학교'] },
  { key: '통합과학', school: ['고등학교'] },
  { key: '국어', school: ['초등학교', '중학교', '고등학교'] },
  { key: '독서와 작문', school: ['고등학교'] },
  { key: '사회', school: ['초등학교', '중학교', '고등학교'] },
  { key: '역사', school: ['중학교', '고등학교'] },
  { key: '영어', school: ['초등학교', '중학교', '고등학교'] },
  { key: '수학', school: ['초등학교', '중학교'] },
  { key: '공통수학1', school: ['고등학교'] },
  { key: '공통수학2', school: ['고등학교'] },
  { key: '대수', school: ['고등학교'] },
  { key: '미적분Ⅰ', school: ['고등학교'] },
  { key: '미적분Ⅱ', school: ['고등학교'] },
  { key: '확률과 통계', school: ['고등학교'] },
  { key: '기하', school: ['고등학교'] },
  { key: '경제 수학', school: ['고등학교'] },
] as const;

export function createApp() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repo: any = new FsBlockRepository({ root: ROOT });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curriculum: any = new GepaiCurriculum({});
  const app = express();

  app.use(express.json({ limit: '4mb' }));
  registerApi(app, repo, curriculum);

  if (IS_PROD && existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(join(DIST_DIR, 'index.html'));
    });
  }

  return app;
}

function registerApi(app: express.Express, repo: any, curriculum: any) {
  app.get('/api/archetypes', async (_req, res) => {
    try {
      const [archetypes, vocabulary] = await Promise.all([
        repo.readArchetypes(),
        repo.readVocabulary(),
      ]);
      const lib = new ArchetypeLibrary({ archetypes, vocabulary });
      const items = lib.list().map((a: { id: string }) => ({
        ...a,
        subjectsResolved: lib.subjectsFor(a.id),
      }));
      res.json({ archetypes: items });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/subjects', (_req, res) => {
    res.json({ subjects: SUBJECTS });
  });

  app.get('/api/standards/search', async (req, res) => {
    try {
      const { school, subject, grade, keyword, limit } = req.query;
      const results = await curriculum.search({
        school: (school as string) || undefined,
        subject: (subject as string) || undefined,
        grade: (grade as string) || undefined,
        keyword: (keyword as string) || undefined,
        limit: limit ? Number(limit) : 10,
      });
      res.json({ results });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/units', async (req, res) => {
    try {
      const { school, subject, grade } = req.query;
      if (!subject) return res.json({ groups: [] });
      const results = await curriculum.search({
        school: (school as string) || undefined,
        subject: subject as string,
        grade: (grade as string) || undefined,
        limit: 500,
      });
      res.json({ groups: groupByDomain(results) });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post('/api/generate', async (req, res) => {
    const { school, grade, subject, topic, archetype, standards, objectives, llm } =
      req.body || {};

    try {
      if (!subject || !topic) throw new Error('교과와 주제는 필수입니다.');
      if (!grade) throw new Error('학년(예: 초6, 중2, 고1)은 필수입니다.');
      if (!llm || !llm.apiKey || !llm.provider) {
        throw new Error('LLM 제공자와 API 키가 필요합니다.');
      }

      const codes = Array.isArray(standards) && standards.length > 0 ? standards : null;
      const compose = new ComposeWorksheet({ blockRepository: repo, curriculum });
      const composed = await compose.execute({
        grade,
        subject,
        topic,
        archetype: archetype && archetype !== 'auto' ? archetype : null,
        codes,
        limit: 6,
        objectives: Array.isArray(objectives) ? objectives : [],
      });

      const filledManifest = await fillManifestWithLLM({
        manifest: composed.manifest,
        brief: composed.brief,
        topic,
        school,
        grade,
        subject,
        llm,
      });

      const asm = new AssembleWorksheet({ blockRepository: repo, curriculum });
      const { html, worksheet } = await asm.execute(filledManifest);
      const { student, teacher } = new BuildVariants().execute(html);

      const knownHexes = await loadKnownSubjectHexes(repo);
      const validator = new ValidateWorksheet({ knownSubjectHexes: knownHexes });
      const studentCheck = validator.execute(student);
      const teacherCheck = validator.execute(teacher);

      const id = `${Date.now()}-${randomBytes(3).toString('hex')}`;
      const dir = join(OUT_DIR, id);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(filledManifest, null, 2), 'utf8');
      await writeFile(join(dir, 'student.html'), student, 'utf8');
      await writeFile(join(dir, 'teacher.html'), teacher, 'utf8');

      res.json({
        id,
        topic,
        archetype: composed.archetype,
        archetypeReason: composed.archetypeReason,
        standards: composed.standards.map((s: { code: string; text: string }) => ({
          code: s.code,
          text: s.text,
        })),
        pageCount: worksheet.pageCount(),
        gate: {
          student: { ok: studentCheck.ok, findings: studentCheck.findings },
          teacher: { ok: teacherCheck.ok, findings: teacherCheck.findings },
        },
        urls: {
          student: `/api/result/${id}/student`,
          teacher: `/api/result/${id}/teacher`,
        },
      });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.get('/api/result/:id/:variant', async (req, res) => {
    const { id, variant } = req.params;
    if (!/^[\w-]+$/.test(id) || !['student', 'teacher'].includes(variant)) {
      return res.status(400).send('잘못된 요청');
    }
    const file = join(OUT_DIR, id, `${variant}.html`);
    if (!existsSync(file)) return res.status(404).send('결과를 찾을 수 없습니다.');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(await readFile(file, 'utf8'));
  });
}
