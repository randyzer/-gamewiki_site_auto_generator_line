import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { ContractError } from '../contracts/errors.mjs';
import { purposeContextDigest } from '../contracts/context-digest.mjs';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { approvalRecordDigest, createApprovalStore } from './approval-store.mjs';
import { createApprovalConsumptionStore } from './approval-consumption-store.mjs';
import { createApprovalRevocationStore } from './approval-revocation-store.mjs';
import { assertApprovalValid } from './approval-invalidation.mjs';
import { ensureDirectoryTree } from '../state/storage-boundary.mjs';
import { writeAtomicFile } from '../state/atomic-file.mjs';

const authorities = new WeakSet();
const trustedConsumptions = new WeakSet();

export function createApprovalRequest(input) {
  const purposeDigest = purposeContextDigest(input.contextDigest, input.purpose, input.purposePayload);
  const request = { kind: 'APPROVAL_REQUEST', schemaVersion: 1, producer: 'APPROVAL_REQUEST_BUILDER',
    mode: input.mode ?? 'SIMULATED', runId: input.runId, stageId: input.stageId, attemptId: input.attemptId,
    contextDigest: input.contextDigest, schemaBundleDigest: input.schemaBundleDigest,
    purpose: input.purpose, purposePayload: structuredClone(input.purposePayload), purposeDigest };
  validateContract('APPROVAL_REQUEST', 1, request);
  return deepFreeze(request);
}

function factory({ rootDirectory, namespace, mode, faults, clock, bindingProvider, policyVersionProvider }) {
  const store = createApprovalStore({ rootDirectory, namespace, mode });
  let revocations;
  const consumptions = createApprovalConsumptionStore({ rootDirectory, anchorRootDirectory: join(rootDirectory, 'approval-trust'),
    namespace, faults,
    validateUnderLock: async ({ reference, expected }) => {
      const record = await store.read(reference);
      await revocations.assertNotRevoked(record);
      if (record.mode !== mode) throw new ContractError('APPROVAL_MODE_MISMATCH', 'Approval mode mismatch');
      if (record.policyVersion !== policyVersionProvider())
        throw new ContractError('APPROVAL_POLICY_MISMATCH', 'Approval policy version changed');
      const nowMs = clock();
      return { approval: assertApprovalValid(record, { ...bindingProvider(expected), nowMs }), nowMs };
    } });
  revocations = createApprovalRevocationStore({ rootDirectory, namespace, mode, consumptions });
  const verify = async (reference, expected) => {
    if (expected.expectedMode && reference?.mode !== expected.expectedMode)
      throw new ContractError('APPROVAL_MODE_MISMATCH', 'Approval mode does not match verifier');
    const record = await store.read(reference);
    await revocations.assertNotRevoked(record);
    if (record.mode !== mode) throw new ContractError('APPROVAL_MODE_MISMATCH', 'Approval mode mismatch');
    return assertApprovalValid(record, expected);
  };
  return { store, consumptions, revocations, verifier: Object.freeze({ verify: (reference, expected) => verify(reference,
    { ...expected, expectedMode: mode }) }), consumer: Object.freeze({ async consume(reference, expected) {
      const lockedExpected = deepFreeze(structuredClone(expected));
      await verify(reference, { ...lockedExpected, expectedMode: mode });
      const consumption = await consumptions.consume({ reference, expected: lockedExpected });
      deepFreeze(consumption); trustedConsumptions.add(consumption); return consumption;
    }, async consumeForOperation(reference, expected, operation) {
      const lockedExpected = deepFreeze(structuredClone(expected));
      const lockedOperation = deepFreeze(structuredClone(operation));
      await verify(reference, { ...lockedExpected, expectedMode: mode });
      const consumption = await consumptions.consumeForOperation({ reference, expected: lockedExpected,
        operation: lockedOperation });
      deepFreeze(consumption); trustedConsumptions.add(consumption); return consumption;
    }, async recoverOperationConsumption(expected) {
      const consumption = await consumptions.readOperation(expected);
      if (!consumption) return null;
      deepFreeze(consumption); trustedConsumptions.add(consumption); return consumption;
    } }) };
}

async function publishSimulatedApproval({ authorityToken, rootDirectory, namespace, store, request, decision, nowMs, expiresAtMs }) {
  if (!authorities.has(authorityToken))
    throw new ContractError('APPROVAL_AUTHORITY_INVALID', 'Approval write requires the private issuance capability');
  const approvalId = `approval-${randomUUID()}`;
  const base = { ...request, kind: 'APPROVAL_RECORD', schemaVersion: 1,
    producer: 'SIMULATED_APPROVAL_AUTHORITY', decision, issuedAtMs: nowMs, expiresAtMs,
    issuer: 'TEST_HOST', nonce: randomUUID(), policyVersion: 'p4-shadow-v1', approvalId, namespace,
    mode: 'SIMULATED' };
  const record = { ...base, recordDigest: approvalRecordDigest(base) };
  validateContract('APPROVAL_RECORD', 1, record);
  await ensureDirectoryTree(rootDirectory, ['approval', namespace, 'records']);
  const path = join(rootDirectory, 'approval', namespace, 'records', `${approvalId}.json`);
  await access(path).then(() => { throw new ContractError('APPROVAL_ID_CONFLICT', 'Approval already exists'); },
    error => { if (error.code !== 'ENOENT') throw error; });
  await writeAtomicFile(path, Buffer.from(`${canonicalJson(record)}\n`));
  const reference = { kind: 'APPROVAL_REFERENCE', schemaVersion: 1, producer: 'APPROVAL_STORE',
    mode: 'SIMULATED', namespace, approvalId, recordDigest: record.recordDigest };
  validateContract('APPROVAL_REFERENCE', 1, reference);
  await store.read(reference);
  return deepFreeze(reference);
}

export function assertTrustedApprovalConsumption(consumption) {
  if (!trustedConsumptions.has(consumption))
    throw new ContractError('APPROVAL_CONSUMPTION_UNTRUSTED', 'Approval consumption was not produced by the verifier');
  validateContract('APPROVAL_CONSUMPTION', consumption.schemaVersion, consumption);
  return consumption;
}

export async function createTestApprovalHarness({ rootDirectory, namespace, faults, clock = () => 1500,
  bindingProvider = expected => expected, policyVersionProvider = () => 'p4-shadow-v1' }) {
  const authorityToken = Object.freeze({ id: randomUUID() }); authorities.add(authorityToken);
  const parts = factory({ rootDirectory, namespace, mode: 'SIMULATED', faults, clock,
    bindingProvider, policyVersionProvider });
  const authority = Object.freeze({ async issue(request, { decision, nowMs, expiresAtMs }) {
    if (!authorities.has(authorityToken)) throw new ContractError('APPROVAL_AUTHORITY_INVALID', 'Missing issuance capability');
    if (request.mode !== 'SIMULATED' || expiresAtMs <= nowMs) throw new ContractError('APPROVAL_REQUEST_INVALID', 'Invalid simulated approval request');
    validateContract('APPROVAL_REQUEST', 1, request);
    return publishSimulatedApproval({ authorityToken, rootDirectory, namespace, store: parts.store, request,
      decision, nowMs, expiresAtMs });
  }, async revoke(reference, { nowMs, reasonCode }) {
    if (!authorities.has(authorityToken)) throw new ContractError('APPROVAL_AUTHORITY_INVALID', 'Missing revocation capability');
    await parts.store.read(reference);
    return parts.revocations.revoke(reference, { nowMs, reasonCode });
  } });
  return Object.freeze({ authority, verifier: parts.verifier, consumer: parts.consumer });
}

export function createProductionApprovalVerifier({ rootDirectory }) {
  return Object.freeze({ async verify(reference) {
    if (reference?.mode !== 'PRODUCTION') throw new ContractError('APPROVAL_MODE_MISMATCH', 'Production rejects simulated approvals');
    throw new ContractError('APPROVAL_PRODUCTION_UNAVAILABLE', `P4 has no production approval adapter at ${rootDirectory}`);
  } });
}
