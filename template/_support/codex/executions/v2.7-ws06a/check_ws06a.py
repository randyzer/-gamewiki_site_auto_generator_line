from pathlib import Path
import difflib
import hashlib
import json
import runpy
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
helpers = runpy.run_path(str(ROOT / 'template/codex/executions/v2.7-ws01/check_ws01.py'))
fingerprint, git = helpers['fingerprint'], helpers['git']
data = json.loads((OUT / 'provenance.json').read_text())
postflight, changed, rollback = {}, [], []

for repo, names in data['scope'].items():
    base = ROOT / repo
    before = data['preflight'][repo]
    assert git(base, 'rev-parse', 'HEAD') == before['head']
    assert git(base, 'rev-parse', 'HEAD^{tree}') == before['tree']
    assert git(base, 'branch', '--show-current') == before['branch']
    current_names = subprocess.check_output(
        ['git', '-C', str(base), 'ls-files', '--cached', '--others', '--exclude-standard', '-z']
    ).decode().split('\0')
    current = {name: fingerprint(base / name) for name in current_names if name and (base / name).exists()}
    assert set(current) - set(before['files']) <= set(names), 'unknown added product file'
    assert not (set(before['files']) - set(current)), 'product file deleted'
    for name, old in before['files'].items():
        if name not in names:
            assert current[name] == old, 'out-of-scope change: ' + repo + '/' + name
    difference = []
    for name in names:
        path = repo + '/' + name
        entry = data['preimages'][path]
        after = current.get(name)
        if after == entry['fingerprint']:
            continue
        assert after is not None
        changed.append(path)
        previous_text = (ROOT / entry['preimage']).read_text() if entry['preimage'] else ''
        difference.extend(difflib.unified_diff(previous_text.splitlines(True), (base / name).read_text().splitlines(True),
                                             fromfile='accepted-preimage/' + name, tofile='ws06a/' + name))
        rollback.append({'path': path, 'preimage': entry['preimage'], 'preimageFingerprint': entry['fingerprint'],
                         'postimageFingerprint': after, 'action': 'restore_exact_preimage' if entry['preimage'] else 'remove_new_file',
                         'guard': 'current fingerprint must equal recorded WS06A postimage; otherwise STOP'})
    label = 'starter' if 'STARTER_PHASE1' in repo else 'sop' if 'GAME_SOP' in repo else 'master-prompt'
    (OUT / (label + '.diff')).write_text(''.join(difference))
    postflight[repo] = {'head': before['head'], 'tree': before['tree'], 'branch': before['branch'], 'files': current,
                        'workingTreeManifestSha256': hashlib.sha256(json.dumps(current, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}
    assert subprocess.run(['git', '-C', str(base), 'diff', '--check'], capture_output=True).returncode == 0

for name, expected in data['protectedFileSnapshot'].items():
    assert fingerprint(ROOT / name) == expected, 'protected file changed: ' + name
for repo, expected in data['sourcePreflight'].items():
    base = ROOT / repo
    assert git(base, 'rev-parse', 'HEAD') == expected['head']
    assert git(base, 'rev-parse', 'HEAD^{tree}') == expected['tree']
    for ref in expected['branches'].splitlines():
        name, commit = ref.split(':')
        assert git(base, 'rev-parse', name) == commit
    if 'STARTER_PHASE1' not in repo:
        assert (git(base, 'status', '--short') or 'CLEAN') == expected['status']
        for name, old in expected['files'].items():
            assert fingerprint(base / name) == old

starter_repo = next(repo for repo in data['scope'] if 'STARTER_PHASE1' in repo)
starter = ROOT / starter_repo
old = json.loads((ROOT / data['preimages'][starter_repo + '/package-lock.json']['preimage']).read_text())
new = json.loads((starter / 'package-lock.json').read_text())
assert set(new['packages']) - set(old['packages']) == {'node_modules/playwright', 'node_modules/playwright-core'}
assert {k: v for k, v in old.items() if k != 'packages'} == {k: v for k, v in new.items() if k != 'packages'}
for name, value in old['packages'].items():
    if name == '':
        value['devDependencies']['playwright'] = '1.63.0'
    assert new['packages'][name] == value, 'unrelated dependency change: ' + name
package = json.loads((starter / 'package.json').read_text())
assert package['dependencies'] == data['packageBefore']['dependencies']
expected_dev = {**data['packageBefore']['devDependencies'], 'playwright': '1.63.0'}
assert package['devDependencies'] == expected_dev
assert package['scripts'] == {**data['packageBefore']['scripts'], 'check:browser': 'tsx scripts/run-core-browser-evidence.ts'}
contract = ROOT / 'Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE' / data['canonicalContract']['canonicalPath']
assert fingerprint(contract)['sha256'] == data['canonicalContract']['sha256']
dependency_diff = []
for name in ['package.json', 'package-lock.json']:
    previous = ROOT / data['preimages'][starter_repo + '/' + name]['preimage']
    dependency_diff.extend(difflib.unified_diff(previous.read_text().splitlines(True), (starter / name).read_text().splitlines(True),
                                               fromfile='accepted-preimage/' + name, tofile='ws06a/' + name))
(OUT / 'dependency.diff').write_text(''.join(dependency_diff))
(OUT / 'rollback-manifest.json').write_text(json.dumps({'forbidden': ['reset --hard', 'checkout .', 'git clean', 'delete branch', 'delete shared browser cache'], 'files': rollback}, indent=2) + '\n')
data['postflight'] = postflight
data['actualChangedProductFiles'] = changed
data['sourceProtectionCheck'] = 'PASS; frozen sources/reference projects protected; only explicitly authorized WS06A Starter Core fixes changed;743 files and existing refs intact'
data['dependencyCheck'] = 'PASS; dev-only playwright/core1.63.0, no unrelated lock change'
(OUT / 'provenance.json').write_text(json.dumps(data, indent=2) + '\n')
print('Scope/source/dependency/Contract audit PASS;', len(changed), 'product files changed')
