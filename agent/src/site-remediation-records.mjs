import { canonicalJson, deepFreeze } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { validateContract } from './contracts/registry.mjs';
import { canonicalContractDigest } from './site-acceptance-contract.mjs';
import { STAGE } from './stages.mjs';

export const SITE_REMEDIATION_POLICY_VERSION = 'site-remediation-transaction-v1';
export const SITE_REMEDIATION_PRESERVED_STAGES = Object.freeze([
  STAGE.HOMEPAGE_RESEARCH,
  STAGE.KEYWORD_RESEARCH,
  STAGE.TEMPLATE_SELECTION,
  STAGE.CONTENT_INTEGRATION,
]);
export const SITE_REMEDIATION_INVALIDATED_STAGES = Object.freeze([
  STAGE.UI_UX_AUDIT,
  STAGE.PRELAUNCH_ACCEPTANCE,
  STAGE.DEPLOYMENT_PLAN,
]);

const mismatch = field => new ContractError('SITE_REMEDIATION_DIGEST_MISMATCH',
  `${field} mismatch`);

function rejectDerived(input, field) {
  if (Object.hasOwn(input, field)) {
    throw new ContractError('SITE_REMEDIATION_DERIVED_FIELD_INVALID',
      `Caller cannot supply derived field: ${field}`, { field });
  }
}

function sortedUnique(values, label) {
  const output = structuredClone(values).sort((left, right) => left.localeCompare(right));
  if (new Set(output).size !== output.length) {
    throw new ContractError('SITE_REMEDIATION_DUPLICATE', `${label} contains duplicates`);
  }
  return output;
}

function assertExactStages(actual, expected, label) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new ContractError('SITE_REMEDIATION_STAGE_SCOPE_INVALID',
      `${label} do not match the approved remediation scope`);
  }
}

function createRecord(input, { kind, digestField, tag, normalize = value => value }) {
  rejectDerived(input, digestField);
  const body = normalize({
    ...structuredClone(input),
    kind,
    schemaVersion: 1,
    producer: 'SITE_REMEDIATION_TRANSACTION',
    policyVersion: SITE_REMEDIATION_POLICY_VERSION,
  });
  const value = { ...body, [digestField]: canonicalContractDigest(tag, body) };
  validateContract(kind, 1, value);
  return deepFreeze(value);
}

function verifyRecord(value, { kind, digestField, tag, scope = null }) {
  validateContract(kind, 1, value);
  if (value.policyVersion !== SITE_REMEDIATION_POLICY_VERSION) {
    throw new ContractError('SITE_REMEDIATION_POLICY_MISMATCH',
      'Site remediation transaction policy changed');
  }
  scope?.(value);
  const { [digestField]: recorded, ...body } = value;
  if (canonicalContractDigest(tag, body) !== recorded) throw mismatch(digestField);
  return value;
}

export function createSiteRemediationPreview(input) {
  return createRecord(input, {
    kind: 'SITE_REMEDIATION_PREVIEW', digestField: 'previewDigest',
    tag: 'SITE_REMEDIATION_PREVIEW_V1',
    normalize: value => ({
      ...value,
      invalidatedStages: [...SITE_REMEDIATION_INVALIDATED_STAGES],
      historicalEvidenceGaps: sortedUnique(value.historicalEvidenceGaps,
        'historical evidence gaps'),
    }),
  });
}

export function verifySiteRemediationPreview(value) {
  return verifyRecord(value, {
    kind: 'SITE_REMEDIATION_PREVIEW', digestField: 'previewDigest',
    tag: 'SITE_REMEDIATION_PREVIEW_V1',
    scope: item => {
      assertExactStages(item.invalidatedStages, SITE_REMEDIATION_INVALIDATED_STAGES,
        'Invalidated stages');
      if (canonicalJson(item.historicalEvidenceGaps) !==
          canonicalJson(sortedUnique(item.historicalEvidenceGaps, 'historical evidence gaps'))) {
        throw new ContractError('SITE_REMEDIATION_NON_CANONICAL',
          'Historical evidence gaps must use canonical sorted order');
      }
    },
  });
}

export function createSiteRemediationIntent(input) {
  return createRecord(input, {
    kind: 'SITE_REMEDIATION_INTENT', digestField: 'intentDigest',
    tag: 'SITE_REMEDIATION_INTENT_V1',
    normalize: value => ({
      ...value,
      committedObjectDigests: sortedUnique(value.committedObjectDigests,
        'committed object digests'),
    }),
  });
}

export function verifySiteRemediationIntent(value) {
  return verifyRecord(value, {
    kind: 'SITE_REMEDIATION_INTENT', digestField: 'intentDigest',
    tag: 'SITE_REMEDIATION_INTENT_V1',
    scope: item => {
      if (item.committedSequence !== item.expectedManifestSequence + 1) {
        throw new ContractError('SITE_REMEDIATION_SEQUENCE_INVALID',
          'Intent must commit exactly one manifest transition');
      }
      if (canonicalJson(item.committedObjectDigests) !== canonicalJson(
        sortedUnique(item.committedObjectDigests, 'committed object digests'))) {
        throw new ContractError('SITE_REMEDIATION_NON_CANONICAL',
          'Committed object digests must use canonical sorted order');
      }
    },
  });
}

export function createSiteRemediationReceipt(input) {
  return createRecord(input, {
    kind: 'SITE_REMEDIATION_RECEIPT', digestField: 'receiptDigest',
    tag: 'SITE_REMEDIATION_RECEIPT_V1',
    normalize: value => ({
      ...value,
      preservedStages: [...SITE_REMEDIATION_PRESERVED_STAGES],
      invalidatedStages: [...SITE_REMEDIATION_INVALIDATED_STAGES],
      deploymentExecuted: false,
    }),
  });
}

export function verifySiteRemediationReceipt(value) {
  return verifyRecord(value, {
    kind: 'SITE_REMEDIATION_RECEIPT', digestField: 'receiptDigest',
    tag: 'SITE_REMEDIATION_RECEIPT_V1',
    scope: item => {
      assertExactStages(item.preservedStages, SITE_REMEDIATION_PRESERVED_STAGES,
        'Preserved stages');
      assertExactStages(item.invalidatedStages, SITE_REMEDIATION_INVALIDATED_STAGES,
        'Invalidated stages');
    },
  });
}

export function createSiteRemediationAbort(input) {
  return createRecord(input, {
    kind: 'SITE_REMEDIATION_ABORT', digestField: 'abortDigest',
    tag: 'SITE_REMEDIATION_ABORT_V1',
  });
}

export function verifySiteRemediationAbort(value) {
  return verifyRecord(value, {
    kind: 'SITE_REMEDIATION_ABORT', digestField: 'abortDigest',
    tag: 'SITE_REMEDIATION_ABORT_V1',
  });
}
