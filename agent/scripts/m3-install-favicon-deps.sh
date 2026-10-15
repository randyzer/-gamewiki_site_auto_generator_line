#!/bin/zsh
# Offline and hash-pinned Mac arm64 install. Modifies only agent/.venv-favicon/.
set -euo pipefail
ROOT="${0:A:h:h}"
if [[ ! -f "$ROOT/deps/requirements-favicon.lock.txt" ]]; then
  echo M3_DEPENDENCY_LOCK_MISSING >&2
  exit 2
fi
PY="/opt/homebrew/bin/python3.12"
if [[ ! -x "$PY" ]]; then
  echo M3_PINNED_PYTHON_MISSING >&2
  exit 2
fi
if [[ "$($PY -c 'import platform;print(platform.machine())')" != "arm64" ]]; then
  echo M3_PINNED_MAC_ARM64_WHEEL_ONLY >&2
  exit 2
fi
if [[ ! -x "$ROOT/.venv-favicon/bin/python" ]]; then
  "$PY" -m venv "$ROOT/.venv-favicon"
fi
"$ROOT/.venv-favicon/bin/python" -m pip install \
  --no-index --no-deps --only-binary=:all: \
  --require-hashes \
  --find-links "$ROOT/deps/m3-favicon-downloads" \
  -r "$ROOT/deps/requirements-favicon.lock.txt"
"$ROOT/.venv-favicon/bin/python" -c \
  'from PIL import __version__;assert __version__=="12.3.0";print("M3_PINNED_PILLOW_VENV_OK")'
