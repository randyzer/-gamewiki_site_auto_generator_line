import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';
import { createPublicationDecision } from '../../publication-v2/publication-engine.mjs';
import { validateStageAdapterInput, validateStageAdapterResult } from '../stage-adapter-contract.mjs';
import { requireStageDependency } from '../stage-dependency-gate.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const digestPattern = /^[a-f0-9]{64}$/;
const fail = (code, message) => { throw new ContractError(code, message); };
const nonempty = value => typeof value === 'string' && value.trim() === value && value.length > 0;
const finite = value => typeof value === 'number' && Number.isFinite(value);

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('CONTRACT_SCHEMA_INVALID', `${label} must be an object`);
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (canonicalJson(actual) !== canonicalJson(expected))
    fail('CONTRACT_SCHEMA_INVALID', `${label} fields do not match the closed contract`);
  return value;
}

function strings(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some(item => !nonempty(item)) ||
      new Set(value).size !== value.length) fail('CONTRACT_SCHEMA_INVALID', `${label} must contain unique strings`);
  return value;
}

function assertDigest(value, label) {
  if (!digestPattern.test(value ?? '')) fail('CONTRACT_SCHEMA_INVALID', `${label} must be a SHA256 digest`);
}

function assertPolicy(fixtureCapabilities, requestedCapabilities) {
  if (!Array.isArray(requestedCapabilities) || !Array.isArray(fixtureCapabilities))
    fail('POLICY_DENIED', 'Offline capability declarations must be arrays');
  const requested = [...fixtureCapabilities, ...requestedCapabilities];
  if (requested.length) fail('POLICY_DENIED', `P5-E content adapter denies ${String(requested[0])}`);
}

export function contentPageDigest(page) {
  const { contentDigest: ignored, ...payload } = page;
  return digest('AGENT_CONTENT_PAGE_V1', payload);
}

export function contentFixtureDigest(fixtureManifest) {
  const { fixtureDigest: ignored, ...payload } = fixtureManifest;
  return digest('AGENT_CONTENT_FIXTURE_V1', payload);
}

export function contentReplayPayloadDigest({ fixtureManifest }) {
  return digest('AGENT_CONTENT_REPLAY_PAYLOAD_V1', fixtureManifest);
}

function sourceIndex(manifest) {
  const sources = new Map();
  for (const source of manifest.sources) {
    exactObject(source, ['sourceId', 'pageId', 'kind', 'sourceDigest', 'verifiable'], 'content source');
    if (!nonempty(source.sourceId) || !nonempty(source.pageId) || !nonempty(source.kind) ||
        source.verifiable !== true) fail('CONTENT_PROVENANCE_INVALID', 'Every source must be explicitly verifiable');
    assertDigest(source.sourceDigest, 'sourceDigest');
    if (sources.has(source.sourceId)) fail('CONTRACT_SCHEMA_INVALID', `Duplicate source: ${source.sourceId}`);
    sources.set(source.sourceId, source);
  }
  if (!sources.size) fail('CONTENT_PROVENANCE_INVALID', 'Content fixture has no sources');
  return sources;
}

function validateRefs(refs, pageId, sources, label, { allowEmpty = false } = {}) {
  strings(refs, label, { allowEmpty });
  for (const sourceId of refs) {
    const source = sources.get(sourceId);
    if (!source || source.pageId !== pageId || source.verifiable !== true)
      fail('CONTENT_PROVENANCE_INVALID', `${label} contains undeclared or cross-page source ${sourceId}`);
  }
}

function usefulText(value, keyword, label) {
  if (!nonempty(value) || value.length < 12 || value.toLowerCase() === keyword.toLowerCase())
    fail('CONTENT_USEFULNESS_INVALID', `${label} must contain a concrete result`);
}

function validateClaims(page, sources) {
  if (!Array.isArray(page.claims) || (!page.claims.length && page.pageType !== 'OMIT'))
    fail('CONTENT_PROVENANCE_INVALID', 'Non-omitted content requires claims');
  const ids = new Set();
  for (const claim of page.claims) {
    exactObject(claim, ['claimId', 'kind', 'statement', 'sourceRefs'], 'content claim');
    if (!nonempty(claim.claimId) || ids.has(claim.claimId) ||
        !['FACT', 'MECHANIC', 'NUMERIC', 'SCREENSHOT'].includes(claim.kind))
      fail('CONTRACT_SCHEMA_INVALID', 'Content claims require unique IDs and supported kinds');
    usefulText(claim.statement, page.keyword, 'Claim');
    validateRefs(claim.sourceRefs, page.pageId, sources, 'claim sourceRefs'); ids.add(claim.claimId);
  }
}

function validateGuide(page, sources) {
  exactObject(page.content, ['steps'], 'guide content');
  if (!Array.isArray(page.content.steps) || page.content.steps.length < 2)
    fail('CONTENT_USEFULNESS_INVALID', 'Guide requires at least two actionable steps');
  page.content.steps.forEach((step, index) => {
    exactObject(step, ['order', 'action', 'expectedOutcome', 'sourceRefs'], 'guide step');
    if (step.order !== index + 1) fail('CONTENT_USEFULNESS_INVALID', 'Guide steps must be consecutively ordered');
    usefulText(step.action, page.keyword, 'Guide action');
    usefulText(step.expectedOutcome, page.keyword, 'Guide outcome');
    validateRefs(step.sourceRefs, page.pageId, sources, 'guide step sourceRefs');
  });
}

function validateBuild(page, sources) {
  exactObject(page.content, ['executionOrder', 'configuration', 'constraints'], 'build content');
  if (!Array.isArray(page.content.configuration) || page.content.configuration.length < 2 ||
      !Array.isArray(page.content.constraints) || page.content.constraints.length === 0)
    fail('CONTENT_USEFULNESS_INVALID', 'Build requires executable configuration and constraints');
  const settings = new Set();
  for (const item of page.content.configuration) {
    exactObject(item, ['settingId', 'setting', 'value', 'reason', 'sourceRefs'], 'build setting');
    if (!nonempty(item.settingId) || settings.has(item.settingId) || !nonempty(item.setting) || !nonempty(item.value))
      fail('CONTENT_USEFULNESS_INVALID', 'Build settings must be executable and unique');
    usefulText(item.reason, page.keyword, 'Build reason');
    validateRefs(item.sourceRefs, page.pageId, sources, 'build setting sourceRefs'); settings.add(item.settingId);
  }
  strings(page.content.executionOrder, 'build executionOrder');
  if (canonicalJson(page.content.executionOrder) !== canonicalJson([...settings]))
    fail('CONTENT_USEFULNESS_INVALID', 'Build execution order must cover every setting exactly once');
  for (const constraint of page.content.constraints) {
    exactObject(constraint, ['rule', 'sourceRefs'], 'build constraint');
    usefulText(constraint.rule, page.keyword, 'Build constraint');
    validateRefs(constraint.sourceRefs, page.pageId, sources, 'build constraint sourceRefs');
  }
}

function evaluateExpression(node, inputs, page, sources, budget, depth = 0) {
  if (++budget.nodes > 64 || depth > 16)
    fail('CONTENT_CALCULATION_INVALID', 'Calculator expression exceeds the evaluation budget');
  if (!node || typeof node !== 'object' || Array.isArray(node))
    fail('CONTENT_CALCULATION_INVALID', 'Calculator expression node is invalid');
  if (node.type === 'VARIABLE') {
    exactObject(node, ['type', 'name'], 'calculator variable');
    if (!Object.hasOwn(inputs, node.name) || !finite(inputs[node.name]))
      fail('CONTENT_CALCULATION_INVALID', `Calculator variable is unknown: ${String(node.name)}`);
    return inputs[node.name];
  }
  if (node.type === 'CONSTANT') {
    exactObject(node, ['type', 'value', 'sourceRefs'], 'calculator constant');
    if (!finite(node.value)) fail('CONTENT_CALCULATION_INVALID', 'Calculator constant must be finite');
    if (!Array.isArray(node.sourceRefs) || !node.sourceRefs.length)
      fail('CONTENT_CALCULATION_INVALID', 'Calculator constant requires factual source references');
    validateRefs(node.sourceRefs, page.pageId, sources, 'calculator constant sourceRefs');
    return node.value;
  }
  const operators = new Set(['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'MIN', 'MAX']);
  if (!operators.has(node.type)) fail('CONTENT_CALCULATION_INVALID', `Unsupported calculator node: ${String(node.type)}`);
  exactObject(node, ['type', 'sourceRefs', 'args'], 'calculator operation');
  if (!Array.isArray(node.sourceRefs) || !node.sourceRefs.length)
    fail('CONTENT_CALCULATION_INVALID', 'Calculator operation requires factual source references');
  validateRefs(node.sourceRefs, page.pageId, sources, 'calculator operation sourceRefs');
  if (!Array.isArray(node.args) || node.args.length < 2 || node.args.length > 8 ||
      (['SUBTRACT', 'DIVIDE'].includes(node.type) && node.args.length !== 2))
    fail('CONTENT_CALCULATION_INVALID', 'Calculator operation arity is invalid');
  const values = node.args.map(child => evaluateExpression(child, inputs, page, sources, budget, depth + 1));
  let result;
  if (node.type === 'ADD') result = values.reduce((sum, value) => sum + value, 0);
  if (node.type === 'SUBTRACT') result = values[0] - values[1];
  if (node.type === 'MULTIPLY') result = values.reduce((product, value) => product * value, 1);
  if (node.type === 'DIVIDE') {
    if (values[1] === 0) fail('CONTENT_CALCULATION_INVALID', 'Calculator cannot divide by zero');
    result = values[0] / values[1];
  }
  if (node.type === 'MIN') result = Math.min(...values);
  if (node.type === 'MAX') result = Math.max(...values);
  if (!finite(result)) fail('CONTENT_CALCULATION_INVALID', 'Calculator result must be finite');
  return result;
}

function validateCalculator(page, sources) {
  exactObject(page.content, ['inputs', 'expression', 'output', 'testVectors'], 'calculator content');
  if (!Array.isArray(page.content.inputs) || !page.content.inputs.length ||
      !Array.isArray(page.content.testVectors) || !page.content.testVectors.length)
    fail('CONTENT_USEFULNESS_INVALID', 'Calculator requires typed inputs and deterministic test vectors');
  const inputs = new Map();
  for (const input of page.content.inputs) {
    exactObject(input, ['name', 'type', 'min', 'max', 'sourceRefs'], 'calculator input');
    if (!nonempty(input.name) || input.type !== 'NUMBER' || !finite(input.min) || !finite(input.max) ||
        input.min >= input.max || inputs.has(input.name)) fail('CONTENT_CALCULATION_INVALID', 'Calculator input range is invalid');
    if (!Array.isArray(input.sourceRefs) || !input.sourceRefs.length)
      fail('CONTENT_CALCULATION_INVALID', 'Calculator input requires factual source references');
    validateRefs(input.sourceRefs, page.pageId, sources, 'calculator input sourceRefs'); inputs.set(input.name, input);
  }
  exactObject(page.content.output, ['name', 'type', 'unit'], 'calculator output');
  if (!nonempty(page.content.output.name) || page.content.output.type !== 'NUMBER' || !nonempty(page.content.output.unit))
    fail('CONTENT_CALCULATION_INVALID', 'Calculator output type is invalid');
  for (const vector of page.content.testVectors) {
    exactObject(vector, ['inputs', 'expected'], 'calculator vector');
    exactObject(vector.inputs, [...inputs.keys()], 'calculator vector inputs');
    if (!finite(vector.expected)) fail('CONTENT_CALCULATION_INVALID', 'Calculator expected value must be finite');
    for (const [name, constraint] of inputs) {
      const value = vector.inputs[name];
      if (!finite(value) || value < constraint.min || value > constraint.max)
        fail('CONTENT_CALCULATION_INVALID', `Calculator vector input is outside range: ${name}`);
    }
    const actual = evaluateExpression(page.content.expression, vector.inputs, page, sources, { nodes: 0 });
    if (Math.abs(actual - vector.expected) > 1e-9)
      fail('CONTENT_CALCULATION_INVALID', 'Calculator test vector does not match the expression');
  }
}

function validateTierList(page, sources) {
  exactObject(page.content, ['criteria', 'tiers'], 'tier-list content');
  if (!Array.isArray(page.content.criteria) || !page.content.criteria.length ||
      !Array.isArray(page.content.tiers) || page.content.tiers.length < 2)
    fail('CONTENT_USEFULNESS_INVALID', 'Tier list requires criteria and ranked tiers');
  const criteria = new Set();
  for (const criterion of page.content.criteria) {
    exactObject(criterion, ['criterionId', 'name', 'sourceRefs'], 'tier-list criterion');
    if (!nonempty(criterion.criterionId) || criteria.has(criterion.criterionId) || !nonempty(criterion.name))
      fail('CONTENT_USEFULNESS_INVALID', 'Tier-list criteria must be unique');
    validateRefs(criterion.sourceRefs, page.pageId, sources, 'tier-list criterion sourceRefs');
    criteria.add(criterion.criterionId);
  }
  const itemIds = new Set(); const ranks = new Set();
  page.content.tiers.forEach((tier, index) => {
    exactObject(tier, ['tier', 'order', 'items'], 'tier-list tier');
    if (!nonempty(tier.tier) || tier.order !== index + 1 || !Array.isArray(tier.items) || !tier.items.length)
      fail('CONTENT_USEFULNESS_INVALID', 'Tier-list tiers must be ordered and nonempty');
    for (const item of tier.items) {
      exactObject(item, ['itemId', 'rank', 'rationale', 'criterionIds', 'sourceRefs'], 'tier-list item');
      if (!nonempty(item.itemId) || itemIds.has(item.itemId) || !Number.isSafeInteger(item.rank) || item.rank < 1 ||
          ranks.has(item.rank)) fail('CONTENT_USEFULNESS_INVALID', 'Tier-list items require unique positive ranks');
      usefulText(item.rationale, page.keyword, 'Tier-list rationale');
      strings(item.criterionIds, 'tier-list criterionIds');
      if (item.criterionIds.some(id => !criteria.has(id)))
        fail('CONTENT_USEFULNESS_INVALID', 'Tier-list item cites an unknown criterion');
      validateRefs(item.sourceRefs, page.pageId, sources, 'tier-list item sourceRefs');
      itemIds.add(item.itemId); ranks.add(item.rank);
    }
  });
}

function validatePage(page, sources) {
  exactObject(page, ['pageId', 'keyword', 'pageType', 'route', 'materialStatus', 'upstreamEligibility',
    'upstreamSourceDigest', 'gapIds', 'sourceRefs', 'claims', 'content', 'contentDigest'], 'content page');
  if (!nonempty(page.pageId) || !nonempty(page.keyword) || !/^\/(?!\/)[^?#\\\s]*$/.test(page.route))
    fail('CONTRACT_SCHEMA_INVALID', 'Content page identity or route is invalid');
  if (!['GUIDE', 'BUILD', 'CALCULATOR', 'TIER_LIST', 'OMIT'].includes(page.pageType) ||
      !['COMPLETED', 'PARTIAL', 'BLOCKED'].includes(page.materialStatus) ||
      !['ELIGIBLE', 'DRAFT_ONLY', 'OMIT', 'UNPROVEN'].includes(page.upstreamEligibility))
    fail('CONTRACT_SCHEMA_INVALID', 'Content page status is invalid');
  const statusMatches = page.materialStatus === 'BLOCKED' ?
    page.upstreamEligibility === 'OMIT' && page.pageType === 'OMIT' :
    page.materialStatus === 'PARTIAL' ? page.upstreamEligibility === 'DRAFT_ONLY' && page.pageType !== 'OMIT' :
      ['ELIGIBLE', 'UNPROVEN'].includes(page.upstreamEligibility) && page.pageType !== 'OMIT';
  if (!statusMatches) fail('CONTENT_USEFULNESS_INVALID', 'Content body conflicts with its upstream status');
  assertDigest(page.upstreamSourceDigest, 'upstreamSourceDigest'); assertDigest(page.contentDigest, 'contentDigest');
  strings(page.gapIds, 'page gapIds', { allowEmpty: true });
  validateRefs(page.sourceRefs, page.pageId, sources, 'page sourceRefs', { allowEmpty: page.pageType === 'OMIT' });
  validateClaims(page, sources);
  if (contentPageDigest(page) !== page.contentDigest)
    fail('CONTRACT_DIGEST_MISMATCH', `Content page digest mismatch: ${page.pageId}`);
  if (page.pageType === 'OMIT') {
    if (page.materialStatus !== 'BLOCKED' || page.upstreamEligibility !== 'OMIT' || page.content !== null ||
        page.claims.length || page.sourceRefs.length) fail('CONTENT_USEFULNESS_INVALID', 'Omitted content must have no body or claims');
    return;
  }
  if (page.content === null) fail('CONTENT_USEFULNESS_INVALID', 'Content page has no useful body');
  if (page.pageType === 'GUIDE') validateGuide(page, sources);
  if (page.pageType === 'BUILD') validateBuild(page, sources);
  if (page.pageType === 'CALCULATOR') validateCalculator(page, sources);
  if (page.pageType === 'TIER_LIST') validateTierList(page, sources);
}

function validateFixture(manifest) {
  exactObject(manifest, ['kind', 'schemaVersion', 'producer', 'classification', 'runId', 'sourceAttempt',
    'contextDigest', 'schemaBundleDigest', 'recoveryDigest', 'evidenceOutcomeDigest', 'handoffDigest',
    'siteRevision', 'domain', 'pendingRows', 'requestedCapabilities', 'sources', 'pages', 'fixtureDigest'],
  'content fixture');
  if (manifest.kind !== 'CONTENT_FIXTURE' || manifest.schemaVersion !== 1 ||
      manifest.producer !== 'P5_E_OFFLINE_FIXTURE' || manifest.classification !== 'OFFLINE_STUB' ||
      !nonempty(manifest.runId) || !Number.isSafeInteger(manifest.sourceAttempt) || manifest.sourceAttempt < 1 ||
      !nonempty(manifest.domain) || !Array.isArray(manifest.pendingRows) ||
      manifest.pendingRows.some(value => !Number.isSafeInteger(value) || value < 1) ||
      new Set(manifest.pendingRows).size !== manifest.pendingRows.length || !Array.isArray(manifest.pages) ||
      !manifest.pages.length) fail('CONTRACT_SCHEMA_INVALID', 'Content fixture identity is invalid');
  for (const name of ['contextDigest', 'schemaBundleDigest', 'recoveryDigest', 'evidenceOutcomeDigest',
    'handoffDigest', 'siteRevision', 'fixtureDigest']) assertDigest(manifest[name], name);
  assertPolicy(manifest.requestedCapabilities, []);
  const sources = sourceIndex(manifest); const pageIds = new Set(); const routes = new Set();
  for (const page of manifest.pages) {
    validatePage(page, sources);
    if (pageIds.has(page.pageId) || routes.has(page.route))
      fail('CONTRACT_SCHEMA_INVALID', 'Content fixture pages require unique IDs and routes');
    pageIds.add(page.pageId); routes.add(page.route);
  }
  if ([...sources.values()].some(source => !pageIds.has(source.pageId)))
    fail('CONTENT_PROVENANCE_INVALID', 'Content source belongs to an unknown page');
  if (contentFixtureDigest(manifest) !== manifest.fixtureDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Content fixture digest mismatch');
  return sources;
}

function assertHandoffCoverage(manifest, handoff) {
  const materials = new Map(handoff.materials.map(item => [item.keywordId, item]));
  if (materials.size !== manifest.pages.length) fail('PUBLICATION_HANDOFF_MISMATCH', 'Page set does not cover the handoff');
  for (const page of manifest.pages) {
    const material = materials.get(page.pageId);
    if (!material || material.keyword !== page.keyword || material.canonicalStatus !== page.materialStatus ||
        material.publicationEligibility !== page.upstreamEligibility || material.sourceDigest !== page.upstreamSourceDigest ||
        canonicalJson(material.gapIds) !== canonicalJson(page.gapIds))
      fail('PUBLICATION_HANDOFF_MISMATCH', `Page does not preserve handoff material: ${page.pageId}`);
    if (page.upstreamEligibility === 'UNPROVEN')
      fail('CONTENT_UNPROVEN', `Unproven content cannot enter publication: ${page.pageId}`);
  }
  if (canonicalJson(manifest.pendingRows) !== canonicalJson(handoff.pendingRows))
    fail('CONTRACT_BINDING_MISMATCH', 'Content fixture pending rows do not match the handoff');
}

export function replayContentIntegration(input) {
  assertPolicy(input.fixtureManifest?.requestedCapabilities ?? [], input.requestedCapabilities ?? []);
  validateStageAdapterInput(input.adapterInput);
  if (input.adapterInput.canonicalStageId !== 'content-integration')
    fail('CONTRACT_BINDING_MISMATCH', 'Content adapter requires content-integration');
  validateFixture(input.fixtureManifest);
  if (contentReplayPayloadDigest(input) !== input.adapterInput.payloadDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Content replay payload digest mismatch');
  const { fixtureManifest: manifest } = input;
  if (manifest.runId !== input.adapterInput.runId || manifest.runId !== input.handoff?.runId ||
      manifest.contextDigest !== input.adapterInput.contextDigest ||
      manifest.handoffDigest !== input.handoff?.handoffDigest || manifest.sourceAttempt !== input.handoff?.attemptId ||
      manifest.siteRevision !== input.handoff?.siteRevision || manifest.domain !== input.handoff?.domain ||
      manifest.schemaBundleDigest !== input.handoff?.schemaBundleDigest ||
      manifest.recoveryDigest !== input.handoff?.recoveryDigest ||
      manifest.evidenceOutcomeDigest !== input.handoff?.evidenceOutcomeDigest)
    fail('CONTRACT_BINDING_MISMATCH', 'Content fixture does not bind the adapter and handoff');
  const dependency = requireStageDependency({ handoff: input.handoff, projection: input.projection,
    runId: input.adapterInput.runId, contextDigest: input.adapterInput.contextDigest,
    producerCanonicalStageId: 'keyword-research', consumerCanonicalStageId: 'content-integration',
    purpose: 'PARTIAL_HANDOFF' });
  assertHandoffCoverage(manifest, input.handoff);
  const pages = manifest.pages.map(page => ({ pageId: page.pageId, route: page.route,
    eligibility: page.upstreamEligibility, sourceDigest: page.contentDigest }));
  const publicationDecision = createPublicationDecision({ handoff: input.handoff, stageId: 'stage-4',
    buildDigest: manifest.fixtureDigest, pages });
  const contentManifest = deepFreeze({
    kind: 'OFFLINE_CONTENT_MANIFEST', schemaVersion: 1, producer: 'P5_E_CONTENT_ADAPTER',
    classification: 'OFFLINE_STUB', authoritative: false, runId: manifest.runId,
    canonicalStageId: input.adapterInput.canonicalStageId, mappingVersion: input.adapterInput.mappingVersion,
    sourceAttempt: manifest.sourceAttempt, contextDigest: manifest.contextDigest,
    handoffDigest: manifest.handoffDigest, siteRevision: manifest.siteRevision, domain: manifest.domain,
    pages: manifest.pages.map(page => ({ pageId: page.pageId, keyword: page.keyword, pageType: page.pageType,
      route: page.route, materialStatus: page.materialStatus, eligibility: page.upstreamEligibility,
      contentDigest: page.contentDigest, useful: page.pageType !== 'OMIT' })),
    contentDigest: manifest.fixtureDigest,
  });
  const stageResult = {
    kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1, producer: 'V2_STAGE_ADAPTER', mode: 'OFFLINE',
    runId: input.adapterInput.runId, canonicalStageId: input.adapterInput.canonicalStageId,
    mappingVersion: input.adapterInput.mappingVersion, contextDigest: input.adapterInput.contextDigest,
    inputDigest: digest('AGENT_STAGE_ADAPTER_INPUT_V1', input.adapterInput),
    status: input.projection.status === 'PARTIAL' ? 'PARTIAL' : 'COMPLETED', authoritative: false,
    artifactDigests: [contentManifest.contentDigest, publicationDecision.publicationDigest].sort(),
    errorCodes: input.projection.status === 'PARTIAL' ? ['UPSTREAM_PARTIAL_DRAFT_ONLY'] : [],
  };
  validateStageAdapterResult(stageResult);
  return deepFreeze({ stageResult, dependency, contentManifest, publicationDecision,
    productionEffects: 0, routeCoverageProven: false });
}
