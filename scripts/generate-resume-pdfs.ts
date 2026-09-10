import path from "node:path";

import { renderPdfsWithHarness } from "./resume/browser";
import {
  installPdfs,
  prepareOutputs,
  removeTemporaryPdfs,
  type ResumeOutput,
} from "./resume/files";

export { createHarnessEnvironment } from "./resume/browser";

export { verifyPdf, type ResumeOutput } from "./resume/files";

type GenerateResumePdfsOptions = {
  readonly outputDirectory?: string;
  readonly publicDirectory?: string;
  readonly renderPdfs?: (outputs: readonly ResumeOutput[]) => Promise<void>;
};

async function renderAndInstall(
  outputs: readonly ResumeOutput[],
  renderPdfs: (outputs: readonly ResumeOutput[]) => Promise<void>,
): Promise<void> {
  let primaryError: Error | null = null;

  try {
    await renderPdfs(outputs);
    await installPdfs(outputs);
  } catch (cause) {
    primaryError =
      cause instanceof Error ? cause : new Error("Resume generation failed", { cause });
  }

  const cleanupErrors = await removeTemporaryPdfs(outputs);

  if (primaryError !== null) {
    for (const error of cleanupErrors) process.stderr.write(`${error.stack ?? error.message}\n`);
    throw primaryError;
  }

  if (cleanupErrors.length > 0)
    throw new AggregateError(cleanupErrors, "Temporary PDF cleanup failed");
}

export async function generateResumePdfs(options: GenerateResumePdfsOptions = {}): Promise<void> {
  const directory = options.outputDirectory ?? path.resolve(".resume");
  const publicDirectory = options.publicDirectory ?? path.resolve("public");
  const outputs = await prepareOutputs(directory, publicDirectory);
  await renderAndInstall(outputs, options.renderPdfs ?? renderPdfsWithHarness);

  for (const output of outputs)
    process.stdout.write(`Generated ${path.relative(process.cwd(), output.finalPath)}\n`);
}

if (import.meta.main) await generateResumePdfs();
