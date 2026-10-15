import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AGENT_ROOT } from './skill-lock.mjs';
import { safePath, sha256 } from './files.mjs';
import { validateEntryInputs, inspectEntryCard } from './entry-v1.mjs';
import { loadConfiguration } from './orchestrator.mjs';

// Read explicit numbered source tables, never the author's suggested URLs or prose.
export function inspectKeywordSource(text) {
  const lines = text.split(/\r?\n/), retained = new Map(), pending = [];
  let columns = null, tables = 0;
  for (const [index, line] of lines.entries()) {
    if (!line.trim().startsWith('|')) { columns = null; continue; }
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
    const keyword = cells.findIndex(x => /^关键词(?:（.*）)?$/.test(x));
    const row = cells.findIndex(x => /^(第几行|截图行号|原始行号)$/.test(x));
    if (keyword >= 0 && row >= 0) { columns = { keyword, row }; tables++; continue; }
    if (!columns || cells.every(x => /^:?-+:?$/.test(x))) continue;
    const raw = cells[columns.keyword], number = cells[columns.row];
    if (!raw || !/^\d+$/.test(number ?? '')) throw Error('KEYWORD_SOURCE_ROW_INVALID');
    const item = { raw, sourceLine: index + 1, tableRow: Number(number) };
    if (/\.\.\.|…|待核实|截断/.test(raw)) {
      pending.push({ ...item, reason: 'TRUNCATED_OR_UNVERIFIED' }); continue;
    }
    const value = raw.replace(/^`([^`]+)`$/, '$1').trim();
    if (!retained.has(value)) retained.set(value, { keyword: value, sourceLines: [], tableRows: [] });
    const kept = retained.get(value);
    kept.sourceLines.push(item.sourceLine);
    if (!kept.tableRows.includes(item.tableRow)) kept.tableRows.push(item.tableRow);
  }
  if (!tables || !retained.size) throw Error('KEYWORD_SOURCE_FORMAT_UNSUPPORTED');
  const gap = text.match(/第\s*(\d+)\s*[–—-]\s*(\d+)\s*[条行][^\n]*(?:未提供|缺失)/);
  return { kind: 'KEYWORD_SOURCE_INSPECTION_V1', sourceLineCount: lines.length,
    retained: [...retained.values()], pending,
    missingRows: gap ? { first: Number(gap[1]), last: Number(gap[2]) } : null,
    scope: 'USER_APPROVED_COMPLETE_READABLE_TERMS_ONLY', researchExecuted: false };
}

export async function prepareRealRunPreflight(inputs, id) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id ?? '')) throw Error('PREFLIGHT_ID_INVALID');
  const normalized = validateEntryInputs(inputs);
  if (!normalized.rawKeywordsFile) throw Error('PREFLIGHT_KEYWORDS_REQUIRED');
  const original = await safePath(normalized.rawKeywordsFile, [normalized.rawKeywordsFile]);
  const bytes = await readFile(original), originalSha256 = sha256(bytes);
  const keywords = inspectKeywordSource(bytes.toString('utf8'));
  const entry = await inspectEntryCard(normalized), config = await loadConfiguration();
  const templateRoots = [];
  for (const root of config.templateRoots) {
    try {
      await safePath(root, [root]);
      const entries = await readdir(root, { withFileTypes: true });
      templateRoots.push({ path: root, readable: true, candidates: entries.filter(x => x.isDirectory() && !x.name.startsWith('.')).map(x => x.name) });
    } catch { templateRoots.push({ path: root, readable: false, verification: 'TEMPLATE_ROOT_UNAVAILABLE' }); }
  }
  const directory = join(AGENT_ROOT, 'runs', id);
  await safePath(directory, [AGENT_ROOT]);
  await mkdir(directory, { mode: 0o700 });
  const derived = join(directory, 'complete-readable-keywords.md');
  const material = '# User-approved complete readable keyword subset\n\n' +
    `Original: ${original}\nOriginal SHA256: ${originalSha256}\n\n` +
    keywords.retained.map(x => '- ' + x.keyword).join('\n') + '\n';
  await writeFile(derived, material, { flag: 'wx', mode: 0o400 });
  const report = { kind: 'REAL_RUN_PREFLIGHT_V1', createdAt: new Date().toISOString(),
    status: 'NOT_AUTHORIZED_TO_EXECUTE', identity: normalized.gameIdentity,
    gameMetadata: normalized.gameMetadata, identityEvidence: 'USER_SUPPLIED; current official sources not collected',
    original: { path: original, sha256: originalSha256, bytes: bytes.length },
    derived: { path: derived, sha256: sha256(material) }, keywords, entry, templateRoots,
    sourceRequirements: ['Current Steam facts', 'Official website and support documentation',
      'Run-specific original icon rights and visual approval', 'Research/browser host capability', 'Selected template build tools'],
    missingLaterInputs: entry.checklist.filter(x => x.timing === 'later' && !x.provided).map(x => x.key),
    originalUnchanged: sha256(await readFile(original)) === originalSha256,
    workerStarted: false, pipelineStarted: false, deploymentExecuted: false };
  if (!report.originalUnchanged) throw Error('PREFLIGHT_ORIGINAL_CHANGED');
  await writeFile(join(directory, 'REAL_RUN_PREFLIGHT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o400 });
  await writeFile(join(directory, 'KEYWORD_SOURCE_LINEAGE.json'), JSON.stringify({ original: report.original,
    derived: report.derived, ...keywords }, null, 2) + '\n', { flag: 'wx', mode: 0o400 });
  return { ...report, reportPath: join(directory, 'REAL_RUN_PREFLIGHT.json') };
}
