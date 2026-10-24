import { verify as verifySignature } from 'node:crypto';
import { deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { computeCodeAuthorityEventDigest } from './production-code-authority-digest.mjs';

const domains = Object.freeze({
  CODE_AUTHORITY_APPROVAL: 'AGENT_CODE_AUTHORITY_APPROVAL_V1',
  CODE_AUTHORITY_REVOCATION: 'AGENT_CODE_AUTHORITY_REVOCATION_V1',
});
const fail = (code, message) => { throw new ContractError(code, message); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');

function assertTestInputs({ events, publicKey, trustedHighWater, now }) {
  if (!Array.isArray(events) || events.length === 0 ||
      publicKey?.type !== 'public' || publicKey?.asymmetricKeyType !== 'ed25519') {
    fail('CODE_AUTHORITY_ISSUER_UNTRUSTED', 'A test Ed25519 public key and event chain are required');
  }
  if (!exactKeys(trustedHighWater, ['authorityId', 'terminalSequence', 'terminalEventDigest']) ||
      typeof trustedHighWater.authorityId !== 'string' ||
      !Number.isSafeInteger(trustedHighWater.terminalSequence) || trustedHighWater.terminalSequence < 1 ||
      !/^[a-f0-9]{64}$/.test(trustedHighWater.terminalEventDigest ?? '')) {
    fail('CODE_AUTHORITY_ROLLBACK_DETECTED', 'Trusted test high-water is invalid');
  }
  if (!Number.isSafeInteger(now) || now < 1) {
    fail('CODE_AUTHORITY_CHAIN_CORRUPT', 'Trusted test clock is invalid');
  }
}

function verifyEventSignature(event, publicKey) {
  const domain = domains[event.kind];
  const valid = verifySignature(null, Buffer.from(`${domain}\n${event.eventDigest}`), publicKey,
    Buffer.from(event.signature, 'hex'));
  if (!valid) fail('CODE_AUTHORITY_SIGNATURE_INVALID', 'Code authority signature is invalid');
}

export function verifyTestCodeAuthorityChain(input) {
  if (!exactKeys(input, ['events', 'publicKey', 'trustedHighWater', 'now'])) {
    fail('CODE_AUTHORITY_SCHEMA_INVALID', 'Test verification input is invalid');
  }
  const { events, publicKey, trustedHighWater, now } = input;
  assertTestInputs(input);
  const approvalIds = new Set();
  let previous = null;
  let activeApproval = null;

  for (const source of events) {
    validateContract(source?.kind, source?.schemaVersion, source);
    const event = structuredClone(source);
    if (event.authorityId !== trustedHighWater.authorityId) {
      fail('CODE_AUTHORITY_ISSUER_UNTRUSTED', 'Code authority identity does not match trusted test state');
    }
    if (event.eventDigest !== computeCodeAuthorityEventDigest(event)) {
      fail('CODE_AUTHORITY_DIGEST_MISMATCH', 'Code authority event digest mismatch');
    }
    verifyEventSignature(event, publicKey);
    const expectedSequence = previous === null ? 1 : previous.authoritySequence + 1;
    if (event.authoritySequence !== expectedSequence) {
      fail('CODE_AUTHORITY_SEQUENCE_INVALID', 'Code authority event sequence is not contiguous');
    }
    const expectedPredecessor = previous?.eventDigest ?? null;
    if (event.previousEventDigest !== expectedPredecessor) {
      fail('CODE_AUTHORITY_CHAIN_CORRUPT', 'Code authority predecessor does not match');
    }
    if (event.issuedAt > now || (previous && event.issuedAt < previous.issuedAt)) {
      fail('CODE_AUTHORITY_CHAIN_CORRUPT', 'Code authority event time is invalid');
    }

    if (event.kind === 'CODE_AUTHORITY_APPROVAL') {
      if (event.expiresAt <= event.issuedAt || approvalIds.has(event.approvalId)) {
        fail('CODE_AUTHORITY_CHAIN_CORRUPT', 'Code authority approval identity or expiry is invalid');
      }
      approvalIds.add(event.approvalId);
      activeApproval = event;
    } else {
      if (!activeApproval || event.targetApprovalId !== activeApproval.approvalId ||
          event.targetApprovalDigest !== activeApproval.eventDigest) {
        fail('CODE_AUTHORITY_CHAIN_CORRUPT', 'Revocation does not target the active approval');
      }
      activeApproval = null;
    }
    previous = event;
  }

  if (previous.authoritySequence !== trustedHighWater.terminalSequence ||
      previous.eventDigest !== trustedHighWater.terminalEventDigest) {
    fail('CODE_AUTHORITY_ROLLBACK_DETECTED', 'Code authority history does not match trusted test high-water');
  }
  if (!activeApproval) fail('CODE_AUTHORITY_REVOKED', 'No active code authority approval remains');
  if (activeApproval.expiresAt <= now) fail('CODE_AUTHORITY_EXPIRED', 'Code authority approval expired');
  return deepFreeze({ verificationScope: 'TEST_ONLY', activeApproval: structuredClone(activeApproval) });
}

export function createProductionCodeAuthorityVerifier() {
  fail('CODE_AUTHORITY_BOOTSTRAP_UNAVAILABLE',
    'P0-A has no production signing key, freshness authority, issuer or approval store');
}
