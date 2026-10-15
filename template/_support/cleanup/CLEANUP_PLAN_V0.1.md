# Workspace Cleanup Plan V0.1

Date: 2026-10-01
Status: executed for regenerated artifacts; preserved for research/code assets.

## 1. Removed as disposable generated output

The following classes were removed from the five extracted reference implementations:
- `.next/`
- `node_modules/`
- `test-results/`
- `.last-run.json`
- `tsconfig.tsbuildinfo`

Reason: all are reproducible build/install/test artifacts and are not research evidence or source capability inputs.

## 2. Archived instead of deleted

`template/temp4_based_miniwars.art.pre-sync-backup-20260929` was moved to:

`template/archive/pre-sync/temp4_based_miniwars.art.pre-sync-backup-20260929`

Reason: it contains pre-sync `package.json` and `pnpm-lock.yaml` values that differ from the current extracted implementation. It is provenance, not an active reference implementation.

## 3. Preserved

Do not delete during Phase 0:
- all five current extracted reference source trees
- consolidated five-site audit
- Product Contract
- V2.6.5 capability gap audit
- Core Safety contract/design documents
- S1 implementation and verification evidence
- S2 TL-02 plan as paused design evidence
- S1 Candidate code and tests
