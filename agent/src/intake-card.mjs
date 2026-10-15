import { sha256 } from './files.mjs';

const keys = new Set(['schemaVersion', 'mode', 'targetId', 'gameIdentity', 'objective', 'rawKeywordsFile', 'canonicalOrigin',
  'repository', 'deploymentProvider', 'adRequested', 'adSnippetRef', 'allowedOperations', 'promotionPolicy', 'gameMetadata']);
export function validateIntakeCard(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) throw Error('Task card must be an object');
  for (const key of Object.keys(card)) if (!keys.has(key)) throw Error('Unknown task card field');
  if (card.schemaVersion !== 1 || card.mode !== 'existing-project') throw Error('Unsupported task card version or mode');
  for (const key of ['targetId', 'gameIdentity', 'objective', 'rawKeywordsFile', 'repository']) if (typeof card[key] !== 'string' || !card[key].trim()) throw Error('Missing task card field: ' + key);
  if (!/^[a-zA-Z0-9_-]+$/.test(card.targetId)) throw Error('Unsafe targetId');
  const url = new URL(card.canonicalOrigin);
  if (url.protocol !== 'https:' || url.origin !== card.canonicalOrigin || url.username || url.password) throw Error('Confirmed HTTPS origin required');
  if (!['Vercel', 'Cloudflare'].includes(card.deploymentProvider) || typeof card.adRequested !== 'boolean') throw Error('Invalid provider/ad request');
  if (card.adRequested && typeof card.adSnippetRef !== 'string') throw Error('Missing ad snippet reference');
  if (card.adSnippetRef !== undefined && !/^[A-Za-z0-9_-]+\.html$/.test(card.adSnippetRef)) throw Error('Unsafe ad snippet reference');
  if (!Array.isArray(card.allowedOperations) || card.allowedOperations.length !== 2 ||
    !card.allowedOperations.includes('read-source') || !card.allowedOperations.includes('write-candidate') ||
    card.promotionPolicy !== 'review-required') throw Error('Unsafe operation or promotion policy');
  const text = JSON.stringify(card);
  if (/"[^"\n]*(?:password|secret|token|cookie|private.?key|api.?key)[^"\n]*"\s*:/i.test(text)) throw Error('Credentials are not allowed in task cards');
  return structuredClone(card);
}
export function intakeSummary(card) {
  const valid = validateIntakeCard(card);
  return { schemaVersion: 1, digest: sha256(JSON.stringify(valid)), mode: valid.mode, targetId: valid.targetId,
    gameIdentity: valid.gameIdentity, rawKeywordsFile: valid.rawKeywordsFile, canonicalOrigin: valid.canonicalOrigin,
    repository: valid.repository, deploymentProvider: valid.deploymentProvider, adRequested: valid.adRequested,
    sourceWrites: false, releaseAuthorized: false, promotionPolicy: valid.promotionPolicy };
}
