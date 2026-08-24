import { describe, expect, test } from 'bun:test';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import {
  createHarnessEnvironment,
  generateResumePdfs,
  parseArguments,
  resolvePrivateContentPath,
  verifyPdf,
  type ResumeOutput,
} from './generate-resume-pdfs';
import { generalResume } from '../src/resume/content';

const startedAt = new Date(2026, 7, 24, 9, 8, 7);

describe('parseArguments', () => {
  test('uses canonical content by default', () => {
    expect(parseArguments([])).toEqual({ contentPath: undefined });
  });

  test('accepts one private content override', () => {
    expect(parseArguments(['--content', '.resume/data-platform.json'])).toEqual(
      {
        contentPath: '.resume/data-platform.json',
      },
    );
  });

  test('rejects invalid arguments', () => {
    expect(() => parseArguments(['--profile', 'private'])).toThrow(
      'Unknown argument',
    );
    expect(() => parseArguments(['--content'])).toThrow(
      '--content requires exactly one path',
    );
    expect(() =>
      parseArguments(['--content', '.resume/one.json', 'extra']),
    ).toThrow('--content requires exactly one path');
  });
});

describe('resolvePrivateContentPath', () => {
  test('accepts files inside .resume', () => {
    expect(
      resolvePrivateContentPath('.resume/data-platform.json').endsWith(
        '/.resume/data-platform.json',
      ),
    ).toBe(true);
  });

  test('rejects paths outside .resume and the directory itself', () => {
    expect(() => resolvePrivateContentPath('private.json')).toThrow(
      'must be inside .resume',
    );
    expect(() => resolvePrivateContentPath('.resume')).toThrow(
      'must be inside .resume',
    );
  });
});

describe('createHarnessEnvironment', () => {
  test('removes an inherited content override for canonical content', () => {
    expect(
      createHarnessEnvironment(undefined, {
        PATH: '/bin',
        RESUME_CONTENT_PATH: '/tmp/private.json',
      }),
    ).toEqual({ PATH: '/bin' });
  });

  test('replaces an inherited override with the validated explicit path', () => {
    expect(
      createHarnessEnvironment('/private/validated.json', {
        PATH: '/bin',
        RESUME_CONTENT_PATH: '/tmp/inherited.json',
      }),
    ).toEqual({
      PATH: '/bin',
      RESUME_CONTENT_PATH: '/private/validated.json',
    });
  });
});

describe('generateResumePdfs', () => {
  test('selects stable public paths for canonical generation', async () => {
    const workspace = await createTestWorkspace();

    try {
      await generateResumePdfs(undefined, {
        outputDirectory: workspace.temporaryDirectory,
        publicDirectory: workspace.publicDirectory,
        startedAt,
        renderPdfs: writeLetterPdfs,
      });

      expect((await readdir(workspace.publicDirectory)).sort()).toEqual([
        'harrison-crosse-resume-dark.pdf',
        'harrison-crosse-resume-light.pdf',
      ]);
      expect(await readdir(workspace.temporaryDirectory)).toEqual([]);
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test('uses one daily suffix when both private daily names are free', async () => {
    const workspace = await createTestWorkspace();

    try {
      const contentPath = await writePrivateContent(
        workspace.temporaryDirectory,
      );
      await generateResumePdfs(contentPath, {
        outputDirectory: workspace.temporaryDirectory,
        publicDirectory: workspace.publicDirectory,
        startedAt,
        renderPdfs: writeLetterPdfs,
      });

      expect((await readdir(workspace.temporaryDirectory)).sort()).toEqual([
        'content.json',
        'harrison_crosse_resume_dark_2026_08_24.pdf',
        'harrison_crosse_resume_light_2026_08_24.pdf',
      ]);
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  for (const existingTheme of ['light', 'dark'] as const) {
    test(`uses one full timestamp suffix when the ${existingTheme} private daily file exists`, async () => {
      const workspace = await createTestWorkspace();

      try {
        const contentPath = await writePrivateContent(
          workspace.temporaryDirectory,
        );
        await writeFile(
          resolve(
            workspace.temporaryDirectory,
            `harrison_crosse_resume_${existingTheme}_2026_08_24.pdf`,
          ),
          'existing',
        );
        await generateResumePdfs(contentPath, {
          outputDirectory: workspace.temporaryDirectory,
          publicDirectory: workspace.publicDirectory,
          startedAt,
          renderPdfs: writeLetterPdfs,
        });

        expect((await readdir(workspace.temporaryDirectory)).sort()).toEqual(
          [
            'content.json',
            `harrison_crosse_resume_${existingTheme}_2026_08_24.pdf`,
            'harrison_crosse_resume_dark_2026_08_24_09_08_07.pdf',
            'harrison_crosse_resume_light_2026_08_24_09_08_07.pdf',
          ].sort(),
        );
      } finally {
        await rm(workspace.root, { recursive: true, force: true });
      }
    });
  }

  test('refuses a private full timestamp collision before rendering', async () => {
    const workspace = await createTestWorkspace();
    let rendered = false;

    try {
      const contentPath = await writePrivateContent(
        workspace.temporaryDirectory,
      );
      const collisionPath = resolve(
        workspace.temporaryDirectory,
        'harrison_crosse_resume_dark_2026_08_24_09_08_07.pdf',
      );
      await Promise.all([
        writeFile(
          resolve(
            workspace.temporaryDirectory,
            'harrison_crosse_resume_light_2026_08_24.pdf',
          ),
          'existing daily',
        ),
        writeFile(collisionPath, 'existing timestamp'),
      ]);

      await expect(
        generateResumePdfs(contentPath, {
          outputDirectory: workspace.temporaryDirectory,
          publicDirectory: workspace.publicDirectory,
          startedAt,
          renderPdfs: async () => {
            rendered = true;
          },
        }),
      ).rejects.toThrow('already exists');
      expect(rendered).toBe(false);
      expect(await readFile(collisionPath, 'utf8')).toBe('existing timestamp');
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test('cleans ordinary temporary PDFs when rendering fails', async () => {
    const workspace = await createTestWorkspace();

    try {
      await expect(
        generateResumePdfs(undefined, {
          outputDirectory: workspace.temporaryDirectory,
          publicDirectory: workspace.publicDirectory,
          startedAt,
          renderPdfs: async (outputs) => {
            await writeFile(outputs[0].temporaryPath, 'partial PDF');
            throw new Error('render failed');
          },
        }),
      ).rejects.toThrow('render failed');
      expect(await readdir(workspace.temporaryDirectory)).toEqual([]);
      expect(await readdir(workspace.publicDirectory)).toEqual([]);
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });
});

describe('verifyPdf', () => {
  test('accepts a one-page US Letter PDF', async () => {
    const workspace = await createTestWorkspace();
    const path = resolve(workspace.temporaryDirectory, 'one-page.pdf');

    try {
      await writePdf(path, [[612, 792]]);
      await expect(verifyPdf(path)).resolves.toBeUndefined();
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test('rejects a zero-byte PDF', async () => {
    const workspace = await createTestWorkspace();
    const path = resolve(workspace.temporaryDirectory, 'empty.pdf');

    try {
      await writeFile(path, '');
      await expect(verifyPdf(path)).rejects.toThrow('Invalid PDF');
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test('warns and accepts a multi-page US Letter PDF', async () => {
    const workspace = await createTestWorkspace();
    const path = resolve(workspace.temporaryDirectory, 'multi-page.pdf');
    const warnings: string[] = [];

    try {
      await writePdf(path, [
        [612, 792],
        [612, 792],
      ]);
      await verifyPdf(path, (warning) => warnings.push(warning));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('2 pages');
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });

  test('rejects malformed and non-Letter PDFs', async () => {
    const workspace = await createTestWorkspace();
    const malformedPath = resolve(
      workspace.temporaryDirectory,
      'malformed.pdf',
    );
    const a4Path = resolve(workspace.temporaryDirectory, 'a4.pdf');

    try {
      await writeFile(malformedPath, 'not a PDF');
      await writePdf(a4Path, [[595.28, 841.89]]);
      await expect(verifyPdf(malformedPath)).rejects.toThrow('Invalid PDF');
      await expect(verifyPdf(a4Path)).rejects.toThrow('US Letter');
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
    }
  });
});

async function createTestWorkspace(): Promise<{
  root: string;
  publicDirectory: string;
  temporaryDirectory: string;
}> {
  await mkdir('.resume', { recursive: true });
  const root = await mkdtemp(resolve('.resume/generator-test-'));
  const publicDirectory = resolve(root, 'public');
  const temporaryDirectory = resolve(root, 'temporary');
  await Promise.all([
    mkdir(publicDirectory, { recursive: true }),
    mkdir(temporaryDirectory, { recursive: true }),
  ]);
  return { root, publicDirectory, temporaryDirectory };
}

async function writePrivateContent(directory: string): Promise<string> {
  const path = resolve(directory, 'content.json');
  await writeFile(path, JSON.stringify(generalResume));
  return path;
}

async function writeLetterPdfs(outputs: ResumeOutput[]): Promise<void> {
  await Promise.all(
    outputs.map(({ temporaryPath }) => writePdf(temporaryPath, [[612, 792]])),
  );
}

async function writePdf(
  path: string,
  sizes: Array<[number, number]>,
): Promise<void> {
  const document = await PDFDocument.create();
  for (const size of sizes) document.addPage(size);
  await writeFile(path, await document.save());
}
