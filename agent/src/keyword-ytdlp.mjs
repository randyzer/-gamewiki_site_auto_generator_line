import { constants } from 'node:fs';
import { access, readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { inside } from './files.mjs';

const quote = value => `'${value.replaceAll("'", `'"'"'`)}'`;

export async function keywordYtDlpWrapper(script, python) {
  const libexec = dirname(dirname(script));
  const firstLine = (await readFile(script, 'utf8')).split('\n', 1)[0];
  const interpreter = firstLine.startsWith('#!') ? firstLine.slice(2).trim() : '';
  if (!isAbsolute(interpreter) || await realpath(interpreter) !== python)
    throw Error(`YTDLP_PYTHON_MISMATCH: ${interpreter} does not resolve to pinned Python ${python}`);
  try { await access(join(libexec, 'pyvenv.cfg')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (inside(join(libexec, 'bin'), interpreter))
      throw Error(`YTDLP_VENV_CONFIG_MISSING: ${join(libexec, 'pyvenv.cfg')}`);
    return { content: `#!/bin/sh\nexec ${quote(script)} "$@"\n`, readPaths: [] };
  }
  if (!inside(join(libexec, 'bin'), interpreter))
    throw Error(`YTDLP_VENV_INTERPRETER_OUTSIDE_LIBEXEC: ${interpreter}`);

  const pythonRoot = dirname(dirname(python));
  const runtime = await realpath(join(pythonRoot, 'Resources/Python.app/Contents/MacOS/Python'));
  if (!inside(pythonRoot, runtime))
    throw Error(`YTDLP_FRAMEWORK_OUTSIDE_PYTHON_ROOT: ${runtime}`);
  await access(runtime, constants.X_OK);
  const prefix = libexec.match(/^(.+)\/Cellar\/yt-dlp\/[^/]+\/libexec$/)?.[1];
  const version = (await readFile(join(libexec, 'pyvenv.cfg'), 'utf8')).match(/^version\s*=\s*(\d+\.\d+)\.\d+\s*$/m)?.[1];
  if (!prefix || !version || !inside(join(prefix, 'Cellar', `python@${version}`), python))
    throw Error(`YTDLP_HOMEBREW_LAYOUT_UNSUPPORTED: ${libexec}, ${python}`);
  const dependency = async (formula, suffix, directory = false) => {
    const root = await realpath(join(prefix, 'opt', formula));
    if (!inside(join(prefix, 'Cellar', formula), root) || root === join(prefix, 'Cellar', formula))
      throw Error(`YTDLP_DEPENDENCY_OUTSIDE_FORMULA: ${formula}: ${root}`);
    const path = await realpath(join(root, suffix));
    if (!inside(root, path)) throw Error(`YTDLP_DEPENDENCY_OUTSIDE_FORMULA: ${formula}: ${path}`);
    const metadata = await stat(path);
    if (directory ? !metadata.isDirectory() : !metadata.isFile()) throw Error(`YTDLP_DEPENDENCY_INVALID: ${path}`);
    return path;
  };
  const certifi = await dependency('certifi', `lib/python${version}/site-packages/certifi`, true);
  const ssl = await dependency('openssl@3', 'lib/libssl.3.dylib');
  const crypto = await dependency('openssl@3', 'lib/libcrypto.3.dylib');
  if (dirname(ssl) !== dirname(crypto)) throw Error('YTDLP_OPENSSL_LAYOUT_UNSUPPORTED');
  const certificate = await realpath(join(certifi, 'cacert.pem'));
  const certificateRoot = join(prefix, 'etc/ca-certificates');
  if (!inside(certificateRoot, certificate) || !(await stat(certificate)).isFile())
    throw Error(`YTDLP_CERTIFICATE_OUTSIDE_CA_ROOT: ${certificate}`);
  const tlsEnvironment = { DYLD_LIBRARY_PATH: dirname(ssl), SSL_CERT_FILE: certificate };
  // CPython's macOS launcher handoff preserves pyvenv.cfg discovery without executing its symlink chain.
  // The framework executable is already inside the pinned Python read root; no additional grant is needed.
  return {
    content: `#!/bin/sh\nexport __PYVENV_LAUNCHER__=${quote(interpreter)}\nexport DYLD_LIBRARY_PATH=${quote(tlsEnvironment.DYLD_LIBRARY_PATH)}\nexec ${quote(runtime)} -I ${quote(script)} "$@"\n`,
    readPaths: [certifi, ssl, crypto, certificate],
    tlsEnvironment,
  };
}
