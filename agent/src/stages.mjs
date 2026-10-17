export const STAGE = Object.freeze({
  HOMEPAGE_RESEARCH: 'game-homepage-icon-research',
  KEYWORD_RESEARCH: 'game-innerpage-keyword-information-research',
  TEMPLATE_SELECTION: 'game-site-template-selector',
  CONTENT_INTEGRATION: 'game-site-content-integrator',
  UI_UX_AUDIT: 'game-site-ui-ux-audit-optimizer',
  PRELAUNCH_ACCEPTANCE: 'game-site-prelaunch-gate',
  DEPLOYMENT_PLAN: 'game-site-deploy-and-measurement',
  ADVERTISING_PLAN: 'game-site-adsterra-ad-integration',
});

export const STAGE_DEFINITIONS = Object.freeze([
  { name: STAGE.HOMEPAGE_RESEARCH, label: '首页调研与图标制作', browserDependent: true,
    artifacts: ['HOMEPAGE_RESEARCH.md', 'ICON.zip'],
    inputs: ['gameIdentity', 'projectPath', 'paths', 'objective', 'mode', 'targetId', 'sourceProjectPath', 'taskCardDigest',
      'researchRootName', 'gameMetadata', 'iconSourcePng', 'iconSourceMethod'] },
  { name: STAGE.KEYWORD_RESEARCH, label: '关键词资料调研', browserDependent: true,
    artifacts: ['keywords.json', '关键词处理记录.md', '关键词素材汇总.md', 'KEYWORD_MATERIALS.md'],
    inputs: ['rawKeywordsFile', 'keywordSourceLineageFile', 'keywordRecovery', 'keywordRecoveryDecision', 'keywordEvidencePlan', 'keywordResearchBudget', 'keywordServiceStops', 'keywordServiceResumes'] },
  { name: STAGE.TEMPLATE_SELECTION, label: '模板选择与复制',
    artifacts: ['TEMPLATE_SELECTION_REPORT.md', 'template-copy-manifest.json', 'TEMPLATE_RESIDUE_SCAN.json'], inputs: [] },
  { name: STAGE.CONTENT_INTEGRATION, label: '网站内容整合',
    artifacts: ['CONTENT_INTEGRATION_REPORT.md', 'CONTENT_PAGE_MANIFEST.json', 'CONTENT_PROVENANCE.md', 'CONTENT_GAPS.md'], inputs: ['canonicalRequired', 'canonicalOrigin'] },
  { name: STAGE.UI_UX_AUDIT, label: '页面体验审计', browserDependent: true,
    artifacts: ['UI_UX_AUDIT_REPORT.md', 'UI_UX_AUDIT.json', 'UI_UX_OPTIMIZATION_PLAN.md'], inputs: ['uiMode', 'uiApproval', 'siteRevision'] },
  { name: STAGE.PRELAUNCH_ACCEPTANCE, label: '上线前验收', browserDependent: true,
    artifacts: ['PRELAUNCH_ACCEPTANCE_REPORT.md', 'PRELAUNCH_ACCEPTANCE.json', 'REPAIR_MANIFEST.md'], inputs: ['domain'] },
  { name: STAGE.DEPLOYMENT_PLAN, label: '部署与上线',
    executionArtifacts: ['DEPLOYMENT_REPORT.md', 'DEPLOYMENT_REPORT.json'],
    artifacts: ['DEPLOYMENT_PLAN.md', 'DEPLOYMENT_PLAN.json'], inputs: ['deploymentProvider', 'repo', 'branch', 'dns', 'deploymentPlanAuthorized', 'deploymentPlanApproval'] },
  { name: STAGE.ADVERTISING_PLAN, label: '广告方案准备', planOnly: true,
    artifacts: ['AD_PLACEMENT_PLAN.md', 'AD_INTEGRATION_MANIFEST.json'], inputs: ['adRequested', 'adSnippetRef', 'adsEnabled', 'adCode', 'adApproval', 'liveUrl'] },
].map(stage => Object.freeze({ ...stage, artifacts: Object.freeze(stage.artifacts), inputs: Object.freeze(stage.inputs) })));

export const ALL_STAGES = Object.freeze(STAGE_DEFINITIONS.map(stage => stage.name));
export const AD_STAGE = STAGE.ADVERTISING_PLAN;
export const STAGES = Object.freeze(ALL_STAGES.filter(name => name !== AD_STAGE));
// Existing callers and run directories retain their ordered representation.
export const ARTIFACTS = Object.freeze(STAGE_DEFINITIONS.map(stage => stage.artifacts));
export const INPUT_STAGE = Object.freeze(Object.fromEntries(STAGE_DEFINITIONS.flatMap(stage => stage.inputs.map(key => [key, stage.name]))));
export const BROWSER_STAGES = Object.freeze(STAGE_DEFINITIONS.filter(stage => stage.browserDependent).map(stage => stage.name));
export const PYTHON_STAGES = Object.freeze([
  STAGE.HOMEPAGE_RESEARCH,
  STAGE.KEYWORD_RESEARCH,
  STAGE.TEMPLATE_SELECTION,
  STAGE.CONTENT_INTEGRATION,
  STAGE.UI_UX_AUDIT,
  STAGE.PRELAUNCH_ACCEPTANCE,
]);

// Only the compatibility boundary accepts stage numbers from old approval tickets.
const legacyStageNames = Object.freeze([
  STAGE.HOMEPAGE_RESEARCH, STAGE.KEYWORD_RESEARCH, STAGE.TEMPLATE_SELECTION, STAGE.CONTENT_INTEGRATION,
  STAGE.UI_UX_AUDIT, STAGE.PRELAUNCH_ACCEPTANCE, STAGE.DEPLOYMENT_PLAN, STAGE.ADVERTISING_PLAN,
]);
export function stageName(value) {
  if (Number.isInteger(value)) return legacyStageNames[value] ?? null;
  return ALL_STAGES.includes(value) ? value : null;
}
export function stageDefinition(name) {
  const stage = STAGE_DEFINITIONS.find(stage => stage.name === name);
  if (!stage) throw Error('Unknown stage name: ' + name);
  return stage;
}
export function stageIndex(name) {
  stageDefinition(name);
  return ALL_STAGES.indexOf(name);
}
export function findStage(stages, name) {
  const matches = stages.filter(stage => stage.skill === name);
  if (matches.length !== 1) throw Error('Missing or duplicate stage: ' + name);
  return matches[0];
}
