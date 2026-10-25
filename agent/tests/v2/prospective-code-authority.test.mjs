import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { contractDefinition, validateContract } from '../../src/contracts/registry.mjs';
import { computeCodeAuthorityEventDigest } from '../../src/v2/production-code-authority-digest.mjs';
import * as verifierModule from '../../src/v2/production-code-authority-verifier.mjs';

const { verifyTestCodeAuthorityChain, createProductionCodeAuthorityVerifier } = verifierModule;
const domains = Object.freeze({
  CODE_AUTHORITY_APPROVAL: 'AGENT_CODE_AUTHORITY_APPROVAL_V1',
  CODE_AUTHORITY_REVOCATION: 'AGENT_CODE_AUTHORITY_REVOCATION_V1',
});
const digest = character => character.repeat(64);
const gitSha = character => character.repeat(40);
const { publicKey, privateKey } = generateKeyPairSync('ed25519');

function signedEvent(payload, key = privateKey) {
  const eventDigest = computeCodeAuthorityEventDigest(payload);
  const signature = sign(null, Buffer.from(`${domains[payload.kind]}\n${eventDigest}`), key).toString('hex');
  return Object.freeze({ ...payload, eventDigest, signature });
}

function approval(overrides = {}, key = privateKey) {
  return signedEvent({
    kind: 'CODE_AUTHORITY_APPROVAL', schemaVersion: 1,
    authorityId: 'local-operator-v1', authoritySequence: 1, previousEventDigest: null,
    issuedAt: 1_000, approvalId: 'approval-0001', repositoryIdentityDigest: digest('1'),
    repositoryCommit: gitSha('2'), repositoryTree: gitSha('3'), skillSourceTree: gitSha('4'),
    skillInventoryDigest: digest('5'), schemaBundleDigest: digest('6'),
    productionPolicyDigest: digest('7'), productionPolicyVersion: 1, expiresAt: 10_000,
    ...overrides,
  }, key);
}

function nextApproval(previous, overrides = {}, key = privateKey) {
  return approval({ authoritySequence: previous.authoritySequence + 1,
    previousEventDigest: previous.eventDigest, issuedAt: previous.issuedAt + 100,
    approvalId: `approval-${String(previous.authoritySequence + 1).padStart(4, '0')}`,
    ...overrides }, key);
}

function revocation(previous, target, overrides = {}, key = privateKey) {
  return signedEvent({
    kind: 'CODE_AUTHORITY_REVOCATION', schemaVersion: 1,
    authorityId: target.authorityId, authoritySequence: previous.authoritySequence + 1,
    previousEventDigest: previous.eventDigest, issuedAt: previous.issuedAt + 100,
    targetApprovalId: target.approvalId, targetApprovalDigest: target.eventDigest,
    ...overrides,
  }, key);
}

const highWater = events => ({ authorityId: events[0].authorityId,
  terminalSequence: events.at(-1).authoritySequence,
  terminalEventDigest: events.at(-1).eventDigest });
const verify = (events, overrides = {}) => verifyTestCodeAuthorityChain({
  events, publicKey, trustedHighWater: highWater(events), now: 2_000, ...overrides,
});

test('approval and revocation are closed registered contracts', () => {
  const first = approval();
  const revoked = revocation(first, first);
  assert.equal(contractDefinition(first.kind, 1).producer, 'TRUSTED_HOST_CODE_AUTHORITY_V1');
  assert.equal(contractDefinition(revoked.kind, 1).producer, 'TRUSTED_HOST_CODE_AUTHORITY_V1');
  assert.equal(validateContract(first.kind, 1, first), first);
  assert.equal(validateContract(revoked.kind, 1, revoked), revoked);
  assert.throws(() => validateContract(first.kind, 1, { ...first, extra: true }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => validateContract(revoked.kind, 1, { ...revoked, reason: 'caller text' }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

test('schemas reject malformed identifiers, Git identities, digests and signatures', () => {
  const first = approval();
  for (const [field, value] of [
    ['authorityId', '../authority'], ['approvalId', 'approval/1'],
    ['repositoryCommit', 'A'.repeat(40)], ['repositoryTree', 'f'.repeat(39)],
    ['skillInventoryDigest', 'f'.repeat(63)], ['signature', '0'.repeat(126)],
  ]) assert.throws(() => validateContract(first.kind, 1, { ...first, [field]: value }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID', field);
  for (const field of ['issuedAt', 'expiresAt']) {
    assert.throws(() => validateContract(first.kind, 1, { ...first, [field]: Number.MAX_SAFE_INTEGER + 1 }),
      error => error.code === 'CONTRACT_SCHEMA_INVALID', field);
  }
  const revoked = revocation(first, first);
  assert.throws(() => validateContract(revoked.kind, 1,
    { ...revoked, issuedAt: Number.MAX_SAFE_INTEGER + 1 }),
  error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

test('event digests are deterministic and domain separated', () => {
  const first = approval();
  const { eventDigest, signature, ...payload } = first;
  assert.equal(computeCodeAuthorityEventDigest(payload), eventDigest);
  assert.equal(computeCodeAuthorityEventDigest(first), eventDigest);
  const revoked = revocation(first, first, { issuedAt: first.issuedAt });
  assert.notEqual(revoked.eventDigest, eventDigest);
});

test('a complete valid synthetic chain returns only TEST_ONLY verification', () => {
  const first = approval();
  const second = nextApproval(first);
  const result = verify([first, second]);
  assert.equal(result.verificationScope, 'TEST_ONLY');
  assert.deepEqual(result.activeApproval, second);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.activeApproval), true);
});

test('invalid signature, wrong key and cross-kind signature replay fail closed', () => {
  const first = approval();
  const badSignature = { ...first, signature: `${first.signature.slice(0, -2)}00` };
  assert.throws(() => verify([badSignature]), error => error.code === 'CODE_AUTHORITY_SIGNATURE_INVALID');
  const other = generateKeyPairSync('ed25519');
  assert.throws(() => verifyTestCodeAuthorityChain({ events: [first], publicKey: other.publicKey,
    trustedHighWater: highWater([first]), now: 2_000 }),
  error => error.code === 'CODE_AUTHORITY_SIGNATURE_INVALID');
  const revoked = revocation(first, first);
  assert.throws(() => verify([first, { ...revoked, signature: first.signature }]),
    error => error.code === 'CODE_AUTHORITY_SIGNATURE_INVALID');
});

test('authority identity, sequence and predecessor links are exact', () => {
  const first = approval();
  const wrongAuthority = nextApproval(first, { authorityId: 'other-authority' });
  assert.throws(() => verify([first, wrongAuthority]),
    error => error.code === 'CODE_AUTHORITY_ISSUER_UNTRUSTED');
  const gap = nextApproval(first, { authoritySequence: 3 });
  assert.throws(() => verify([first, gap]), error => error.code === 'CODE_AUTHORITY_SEQUENCE_INVALID');
  const duplicate = nextApproval(first, { authoritySequence: 1 });
  assert.throws(() => verify([first, duplicate]), error => error.code === 'CODE_AUTHORITY_SEQUENCE_INVALID');
  const broken = nextApproval(first, { previousEventDigest: digest('a') });
  assert.throws(() => verify([first, broken]), error => error.code === 'CODE_AUTHORITY_CHAIN_CORRUPT');
});

test('approval identifiers are unique and a new approval supersedes the old one', () => {
  const first = approval();
  const duplicateId = nextApproval(first, { approvalId: first.approvalId });
  assert.throws(() => verify([first, duplicateId]), error => error.code === 'CODE_AUTHORITY_CHAIN_CORRUPT');
  const second = nextApproval(first);
  assert.equal(verify([first, second]).activeApproval.approvalId, second.approvalId);
});

test('revocation must target the current approval and leaves no active approval', () => {
  const first = approval();
  const second = nextApproval(first);
  const obsolete = revocation(second, first);
  assert.throws(() => verify([first, second, obsolete]), error => error.code === 'CODE_AUTHORITY_CHAIN_CORRUPT');
  const revoked = revocation(second, second);
  assert.throws(() => verify([first, second, revoked]), error => error.code === 'CODE_AUTHORITY_REVOKED');
  const forged = { ...revoked, targetApprovalDigest: digest('b') };
  assert.throws(() => verify([first, second, forged]), error => error.code === 'CODE_AUTHORITY_DIGEST_MISMATCH');
});

test('expired, future-dated and time-reordered events fail closed', () => {
  const expired = approval({ expiresAt: 1_500 });
  assert.throws(() => verify([expired]), error => error.code === 'CODE_AUTHORITY_EXPIRED');
  const future = approval({ issuedAt: 2_001, expiresAt: 3_000 });
  assert.throws(() => verify([future]), error => error.code === 'CODE_AUTHORITY_CHAIN_CORRUPT');
  const first = approval();
  const reordered = nextApproval(first, { issuedAt: 999 });
  assert.throws(() => verify([first, reordered]), error => error.code === 'CODE_AUTHORITY_CHAIN_CORRUPT');
});

test('trusted high-water detects mismatch and a truncated signed history', () => {
  const first = approval();
  const second = nextApproval(first);
  assert.throws(() => verifyTestCodeAuthorityChain({ events: [first, second], publicKey,
    trustedHighWater: { ...highWater([first, second]), terminalEventDigest: digest('c') }, now: 2_000 }),
  error => error.code === 'CODE_AUTHORITY_ROLLBACK_DETECTED');
  assert.throws(() => verifyTestCodeAuthorityChain({ events: [first], publicKey,
    trustedHighWater: highWater([first, second]), now: 2_000 }),
  error => error.code === 'CODE_AUTHORITY_ROLLBACK_DETECTED');
});

test('restart validation is deterministic for the same immutable event bytes', () => {
  const first = approval();
  const second = nextApproval(first);
  assert.deepEqual(verify(structuredClone([first, second])), verify(structuredClone([first, second])));
});

test('caller keys or high-water can never establish production trust in P0-A', () => {
  const first = approval();
  assert.equal(verify([first]).verificationScope, 'TEST_ONLY');
  assert.throws(() => createProductionCodeAuthorityVerifier(),
    error => error.code === 'CODE_AUTHORITY_BOOTSTRAP_UNAVAILABLE');
  assert.throws(() => createProductionCodeAuthorityVerifier({ publicKey, trustedHighWater: highWater([first]) }),
    error => error.code === 'CODE_AUTHORITY_BOOTSTRAP_UNAVAILABLE');
  assert.deepEqual(Object.keys(verifierModule).sort(),
    ['createProductionCodeAuthorityVerifier', 'verifyTestCodeAuthorityChain']);
});
