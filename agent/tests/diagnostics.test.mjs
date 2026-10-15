import test from 'node:test';
import assert from 'node:assert/strict';

test('diagnostics redact credential assignments, headers, URL credentials, private keys and environment values', async () => {
  const { sanitizeDiagnosticText, failureDiagnostic } = await import('../src/diagnostics.mjs');
  const cases = [
    ['Missing file; token=PRIVATE_VALUE', 'PRIVATE_VALUE'],
    ['{"api_key":"PRIVATE VALUE WITH SPACES"}', 'PRIVATE VALUE WITH SPACES'],
    ['Authorization: Bearer PRIVATE_VALUE', 'PRIVATE_VALUE'],
    ['Cookie: session=PRIVATE_ONE; auth=PRIVATE_TWO', 'PRIVATE_TWO'],
    ['https://user:PRIVATE_PASSWORD@example.test/?token=PRIVATE_QUERY', 'PRIVATE_PASSWORD'],
    ['-----BEGIN PRIVATE KEY-----\nPRIVATE_KEY_VALUE\n-----END PRIVATE KEY-----', 'PRIVATE_KEY_VALUE'],
    ['Provider failed: ENV_PRIVATE_VALUE', 'ENV_PRIVATE_VALUE'],
    ['CLI failed: --api-key PRIVATE_FLAG_VALUE --password "PRIVATE FLAG PASSWORD"', 'PRIVATE_FLAG_VALUE'],
    ['CLI failed: --password "PRIVATE FLAG PASSWORD"', 'PRIVATE FLAG PASSWORD'],
    ['{"api_key":"PRIVATE_MULTILINE\nPRIVATE_SECOND_LINE"}', 'PRIVATE_SECOND_LINE'],
  ];
  for (const [message, secret] of cases) assert.ok(!sanitizeDiagnosticText(message, { TEST_API_KEY: 'ENV_PRIVATE_VALUE' }).includes(secret));
  assert.equal(failureDiagnostic(Object.assign(Error('File missing'), { code: 'token=PRIVATE_CODE' })).code, 'ERROR');
  assert.doesNotMatch(failureDiagnostic(new SyntaxError('Unexpected token PRIVATE_PARSE_VALUE')).reason, /PRIVATE_PARSE_VALUE/);
  assert.ok(sanitizeDiagnosticText('x'.repeat(10000)).length <= 1600);
});
