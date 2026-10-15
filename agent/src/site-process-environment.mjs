// Site package scripts do not need the orchestrator's service credentials or Node hooks.
export function siteProcessEnvironment(source = process.env) {
  return Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'NODE_ENV', 'PNPM_HOME']
    .filter(name => !/key|token|secret|cookie|password/i.test(name) && typeof source[name] === 'string')
    .map(name => [name, source[name]]));
}
