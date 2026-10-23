import { sourceFiles } from './project-baseline.mjs';
import { sha256 } from './files.mjs';

export const PROJECT_CONTENT_POLICY_VERSION = 1;

export function includedProjectContentPath(path) {
  return !/^docs\/(?:ui-ux-audit|prelaunch|agent-runs)(?:\/|$)/.test(path) &&
    !/^docs\/DEPLOYMENT_(?:PLAN|REPORT)\./.test(path) &&
    !path.endsWith('.tsbuildinfo') && path.split('/').at(-1) !== 'next-env.d.ts';
}

export async function projectContentFiles(root) {
  let files;
  try { files = await sourceFiles(root, { rejectSecrets: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return files
    .filter(file => includedProjectContentPath(file.path))
    .map(file => [file.path, file.sha256]);
}

export async function projectContentDigest(root) {
  return sha256(JSON.stringify(await projectContentFiles(root)));
}
