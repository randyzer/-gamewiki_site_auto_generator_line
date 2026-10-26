import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { validateContract } from './contracts/registry.mjs';

export const SITE_ACCEPTANCE_POLICY_VERSION = 'site-acceptance-v1';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const mismatch = message => new ContractError('SITE_ACCEPTANCE_DIGEST_MISMATCH', message);

function assertAcyclic(value, active = new WeakSet(), visited = new WeakSet()) {
  if (value === null || typeof value !== 'object') return;
  if (active.has(value)) {
    throw new ContractError('SITE_ACCEPTANCE_CYCLE',
      'Contract values cannot contain circular object references');
  }
  if (visited.has(value)) return;
  active.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    assertAcyclic(child, active, visited);
  }
  active.delete(value);
  visited.add(value);
}

export function canonicalContractDigest(tag, value) {
  if (typeof tag !== 'string' || !/^[A-Z0-9_]+_V1$/.test(tag)) {
    throw new ContractError('SITE_ACCEPTANCE_TAG_INVALID',
      'Digest tag must be a V1 protocol tag');
  }
  assertAcyclic(value);
  return sha256(`${tag}\n${canonicalJson(value)}`);
}

function verifyDigest(value, field, tag) {
  const { [field]: recorded, ...body } = value;
  if (canonicalContractDigest(tag, body) !== recorded) throw mismatch(`${field} mismatch`);
  return value;
}

function rejectDerivedInput(input, fields) {
  const field = fields.find(name => Object.hasOwn(input, name));
  if (field) {
    throw new ContractError('SITE_ACCEPTANCE_DERIVED_FIELD_INVALID',
      `Caller cannot supply derived field: ${field}`, { field });
  }
}

const sortedUnique = (values, label) => {
  const output = structuredClone(values)
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
  if (new Set(output.map(value => canonicalJson(value))).size !== output.length) {
    throw new ContractError('SITE_ACCEPTANCE_DUPLICATE', `${label} contains duplicates`);
  }
  return output;
};

export function createImmutableIntegrationLineage(input) {
  assertAcyclic(input);
  rejectDerivedInput(input, ['lineageDigest']);
  const body = {
    ...structuredClone(input),
    kind: 'IMMUTABLE_INTEGRATION_LINEAGE',
    schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT',
    stage3ArtifactDigests: sortedUnique(input.stage3ArtifactDigests, 'Stage 3 artifacts'),
    stage4ArtifactDigests: sortedUnique(input.stage4ArtifactDigests, 'Stage 4 artifacts'),
  };
  const value = {
    ...body,
    lineageDigest: canonicalContractDigest('IMMUTABLE_INTEGRATION_LINEAGE_V1', body),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

export function verifyImmutableIntegrationLineage(value) {
  validateContract('IMMUTABLE_INTEGRATION_LINEAGE', 1, value);
  verifyDigest(value, 'lineageDigest', 'IMMUTABLE_INTEGRATION_LINEAGE_V1');
  return value;
}

export function createCurrentSiteBaseline(input) {
  assertAcyclic(input);
  rejectDerivedInput(input, [
    'inventoryDigest', 'routeInventoryDigest', 'protectedInputsDigest', 'baselineDigest',
  ]);
  if (input.baselineKind === 'REACCEPTED_CURRENT_BASELINE' &&
      input.historicalEquivalence !== false) {
    throw new ContractError('SITE_ACCEPTANCE_LEGACY_EQUIVALENCE_INVALID',
      'A reaccepted current baseline cannot claim historical equivalence');
  }
  const files = sortedUnique(input.files, 'files');
  const routes = sortedUnique(input.routes, 'routes');
  const protectedInputs = sortedUnique(input.protectedInputs, 'protected inputs');
  const historicalEvidenceGaps = sortedUnique(
    input.historicalEvidenceGaps, 'historical evidence gaps',
  );
  const body = {
    ...structuredClone(input),
    kind: 'CURRENT_SITE_BASELINE',
    schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT',
    files,
    inventoryDigest: canonicalContractDigest('SITE_FILE_INVENTORY_V1', files),
    routes,
    routeInventoryDigest: canonicalContractDigest('SITE_ROUTE_INVENTORY_V1', routes),
    protectedInputs,
    protectedInputsDigest: canonicalContractDigest('SITE_PROTECTED_INPUTS_V1', protectedInputs),
    historicalEvidenceGaps,
  };
  const value = {
    ...body,
    baselineDigest: canonicalContractDigest('CURRENT_SITE_BASELINE_V1', body),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

export function verifyCurrentSiteBaseline(value) {
  validateContract('CURRENT_SITE_BASELINE', 1, value);
  if (value.baselineKind === 'REACCEPTED_CURRENT_BASELINE' &&
      value.historicalEquivalence !== false) {
    throw new ContractError('SITE_ACCEPTANCE_LEGACY_EQUIVALENCE_INVALID',
      'A reaccepted current baseline cannot claim historical equivalence');
  }
  if (canonicalContractDigest('SITE_FILE_INVENTORY_V1', value.files) !== value.inventoryDigest ||
      canonicalContractDigest('SITE_ROUTE_INVENTORY_V1', value.routes) !==
        value.routeInventoryDigest ||
      canonicalContractDigest('SITE_PROTECTED_INPUTS_V1', value.protectedInputs) !==
        value.protectedInputsDigest) {
    throw mismatch('Baseline component digest mismatch');
  }
  verifyDigest(value, 'baselineDigest', 'CURRENT_SITE_BASELINE_V1');
  return value;
}

export function createSiteAcceptanceIdentity(input) {
  assertAcyclic(input);
  rejectDerivedInput(input, ['acceptanceRevision']);
  const body = {
    ...structuredClone(input),
    kind: 'SITE_ACCEPTANCE_IDENTITY',
    schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT',
    policyVersion: SITE_ACCEPTANCE_POLICY_VERSION,
  };
  const value = {
    ...body,
    acceptanceRevision: canonicalContractDigest('SITE_ACCEPTANCE_IDENTITY_V1', body),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

export function verifySiteAcceptanceIdentity(value) {
  validateContract('SITE_ACCEPTANCE_IDENTITY', 1, value);
  if (value.policyVersion !== SITE_ACCEPTANCE_POLICY_VERSION) {
    throw new ContractError('SITE_ACCEPTANCE_POLICY_MISMATCH', 'Acceptance policy changed');
  }
  verifyDigest(value, 'acceptanceRevision', 'SITE_ACCEPTANCE_IDENTITY_V1');
  return value;
}

export function createSiteReacceptanceAuthorization(input) {
  assertAcyclic(input);
  rejectDerivedInput(input, ['authorizationDigest']);
  const body = {
    ...structuredClone(input),
    kind: 'SITE_REACCEPTANCE_AUTHORIZATION',
    schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT',
    policyVersion: SITE_ACCEPTANCE_POLICY_VERSION,
  };
  const value = {
    ...body,
    authorizationDigest: canonicalContractDigest('SITE_REACCEPTANCE_AUTHORIZATION_V1', body),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

export function verifySiteReacceptanceAuthorization(value) {
  validateContract('SITE_REACCEPTANCE_AUTHORIZATION', 1, value);
  if (value.policyVersion !== SITE_ACCEPTANCE_POLICY_VERSION) {
    throw new ContractError('SITE_ACCEPTANCE_POLICY_MISMATCH', 'Authorization policy changed');
  }
  verifyDigest(value, 'authorizationDigest', 'SITE_REACCEPTANCE_AUTHORIZATION_V1');
  return value;
}

export function createAuthorizationReservation({
  authorization, confirmationIdentity, intentDigest, reservedAtMs,
}) {
  verifySiteReacceptanceAuthorization(authorization);
  const body = {
    kind: 'SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION',
    schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT',
    authorizationDigest: authorization.authorizationDigest,
    previewId: authorization.previewId,
    confirmationIdentity,
    transactionId: authorization.transactionId,
    intentDigest,
    reservedAtMs,
  };
  const value = {
    ...body,
    reservationDigest: canonicalContractDigest(
      'SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION_V1', body,
    ),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

export function verifyAuthorizationReservation(value, { authorization }) {
  verifySiteReacceptanceAuthorization(authorization);
  validateContract('SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', 1, value);
  if (value.authorizationDigest !== authorization.authorizationDigest ||
      value.previewId !== authorization.previewId ||
      value.transactionId !== authorization.transactionId) {
    throw new ContractError('SITE_ACCEPTANCE_TRANSACTION_MISMATCH',
      'Reservation does not belong to the authorized transaction');
  }
  verifyDigest(value, 'reservationDigest',
    'SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION_V1');
  return value;
}

export function createAuthorizationConsumption({
  authorization, reservation, preManifestSha256, postManifestSha256, committedSequence,
  acceptanceRevision, committedObjectDigests, consumedAtMs,
}) {
  verifyAuthorizationReservation(reservation, { authorization });
  if (preManifestSha256 !== authorization.manifestSha256 ||
      committedSequence !== authorization.manifestSequence + 1 ||
      acceptanceRevision !== authorization.acceptanceRevision) {
    throw new ContractError('SITE_ACCEPTANCE_TRANSACTION_MISMATCH',
      'Consumption does not match the authorized manifest transition');
  }
  const body = {
    kind: 'SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION',
    schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT',
    reservationDigest: reservation.reservationDigest,
    transactionId: reservation.transactionId,
    preManifestSha256,
    postManifestSha256,
    committedSequence,
    acceptanceRevision,
    committedObjectDigests: sortedUnique(committedObjectDigests, 'committed objects'),
    consumedAtMs,
  };
  const value = {
    ...body,
    consumptionDigest: canonicalContractDigest(
      'SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION_V1', body,
    ),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

export function verifyAuthorizationConsumption(value, { authorization, reservation }) {
  verifyAuthorizationReservation(reservation, { authorization });
  validateContract('SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION', 1, value);
  if (value.reservationDigest !== reservation.reservationDigest ||
      value.transactionId !== authorization.transactionId ||
      value.preManifestSha256 !== authorization.manifestSha256 ||
      value.acceptanceRevision !== authorization.acceptanceRevision ||
      value.committedSequence !== authorization.manifestSequence + 1) {
    throw new ContractError('SITE_ACCEPTANCE_TRANSACTION_MISMATCH',
      'Consumption does not match the reserved manifest transition');
  }
  verifyDigest(value, 'consumptionDigest',
    'SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION_V1');
  return value;
}
