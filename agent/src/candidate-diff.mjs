import { sourceFiles } from './project-baseline.mjs';
import { sha256 } from './files.mjs';

export async function candidateDiff(baseline, candidateProjectPath) {
  const files = await sourceFiles(candidateProjectPath, { rejectSecrets: true });
  const before = new Map(baseline.files.map(f => [f.path, f])), after = new Map(files.map(f => [f.path, f]));
  const changes = [], blockers = [];
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const old = before.get(path), current = after.get(path);
    if (old?.sha256 === current?.sha256 && old?.mode === current?.mode) continue;
    const type = !old ? 'ADD' : !current ? 'DELETE' : old.type !== current.type ? 'TYPE_CHANGE' : 'MODIFY';
    const protectedFile = path === baseline.keyword.path.slice(baseline.sourceProjectPath.length + 1) ||
      baseline.protectedPaths.some(prefix => path === prefix || path.startsWith(prefix + '/'));
    const lockfile = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(path);
    if (protectedFile && old) blockers.push('Protected research changed: ' + path);
    if (type === 'DELETE' || type === 'TYPE_CHANGE') blockers.push('Deletion/type change needs explicit review: ' + path);
    if (lockfile) blockers.push('Dependency lockfile change needs explicit review: ' + path);
    changes.push({ relativePath: path, type, beforeSHA256: old?.sha256 ?? null, afterSHA256: current?.sha256 ?? null,
      beforeMode: old?.mode ?? null, afterMode: current?.mode ?? null, scope: protectedFile ? 'research' : 'project', risk: protectedFile || lockfile || type === 'DELETE' ? 'HIGH' : 'REVIEW' });
  }
  for (const deleted of changes.filter(c => c.type === 'DELETE')) {
    const added = changes.find(c => c.type === 'ADD' && c.afterSHA256 === deleted.beforeSHA256);
    if (added) deleted.possibleRenameTo = added.relativePath;
  }
  return { schemaVersion: 1, candidateProjectPath, baselineDigest: baseline.digest,
    candidateDigest: sha256(JSON.stringify(files)), filesDigest: sha256(JSON.stringify(changes)), changes, blockers };
}
