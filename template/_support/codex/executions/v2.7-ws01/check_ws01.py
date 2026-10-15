#!/usr/bin/env python3
"""Read-only WS-01 package/identity checks; synthetic cases never grant approval."""
from copy import deepcopy
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess

ROOT = Path(__file__).resolve().parents[4]
EVIDENCE = Path(__file__).resolve().parent
SOP = ROOT / 'Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE'
PROMPT = ROOT / 'Repo_hotgameweb/GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE'
CANONICAL = 'docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md'
PREDECESSOR = ROOT / 'template/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V0.2.md'
OUTCOMES = {'PASS', 'FAIL', 'NOT_APPLICABLE', 'NOT_SELECTED', 'EXCEPTION'}
STATES = {'NOT_RUN', 'PENDING', 'OBSERVED', 'UNVERIFIED'}
CAP_ROW = re.compile(r'^\| ([A-Z]{2,3}-\d{2}) \|', re.M)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def git(path, *args):
    return subprocess.check_output(['git', '-C', str(path), *args], text=True).strip()


def fingerprint(path):
    data = os.readlink(path).encode() if path.is_symlink() else path.read_bytes()
    return {'sha256': hashlib.sha256(data).hexdigest(),
            'mode': stat.S_IMODE(path.lstat().st_mode), 'symlink': path.is_symlink()}


def section(text, heading, next_heading):
    require(text.count(heading) == 1, 'missing/duplicate section: ' + heading)
    return text.split(heading, 1)[1].split(next_heading, 1)[0]


def registry_lines(text):
    h = section(text, '## H. Product Contract v0.2\n', '### Contract counts')
    return [line for line in h.splitlines() if line.startswith('|')]


def validate_registry(text, predecessor):
    lines = registry_lines(text)
    rows = [line for line in lines if CAP_ROW.match(line)]
    require(len(rows) == 41 and len({CAP_ROW.match(x)[1] for x in rows}) == 41,
            'Registry must have 41 unique IDs')
    require(all(len(x.strip('|').split('|')) == 16 for x in lines), '16 columns required')
    require(lines == registry_lines(predecessor), 'predecessor header/rows changed')
    return {x.split('|')[1].strip(): [c.strip() for c in x.strip('|').split('|')]
            for x in rows}


def validate_reference(text, predecessor, obligations):
    for heading, next_heading in [
        ('## V. Reference Project Regression Model', '## W. Cross-Version Regression Model'),
        ('## W. Cross-Version Regression Model', '## X. Capability Delta Model')]:
        require(section(text, heading, next_heading) == section(predecessor, heading, next_heading),
                'predecessor reference/outcome obligations changed')
    require(obligations['referenceArchetypes'] == {
        'REF-A': 'Wiki / Commercial Editorial', 'REF-B': 'Problem Guide / Tool',
        'REF-C': 'Tactical / Systems'}, 'missing/changed reference archetype')
    require(obligations['realAdoptionProjects'] == [
        'PROJECT-WOG', 'PROJECT-BOMBFARM', 'PROJECT-TASK-GUIDE'], 'real adoption namespace drift')
    require(obligations['realProjectCoverageSubstitutesReferencePass'] is False,
            'real adoption cannot substitute reference PASS')
    require(set(obligations['deterministicReferencePass']) == {'REF-A', 'REF-B', 'REF-C'},
            'reference evidence missing')


def validate_identity(identities, expected):
    require(all(x == expected for x in identities), 'canonical identity mismatch')
    require(expected['canonicalPath'] == CANONICAL and expected['owningArtifact'] == 'GAME_SOP',
            'canonical owner/path mismatch')
    require(all(expected[x] == 'V2.7' for x in [
        'systemVersion', 'productContractVersion', 'capabilityRegistryVersion']), 'version drift')
    require(expected['sha256'] == fingerprint(SOP / CANONICAL)['sha256'], 'actual hash mismatch')
    require(expected['predecessorSha256'] == fingerprint(PREDECESSOR)['sha256'], 'lineage mismatch')


def validate_single_registry(prompt_text):
    require(not CAP_ROW.search(prompt_text), 'Prompt duplicates Registry requirement rows')


def validate_record(record, registry, identity):
    capability = record['capabilityId']
    require(capability in registry, 'unknown capability ID')
    row = registry[capability]
    require(record['canonicalContract'] == identity, 'evidence identity mismatch')
    state, outcome = record['evidenceStatus'], record['verifiedOutcome']
    require(state in STATES, 'unknown evidenceStatus')
    require(outcome is None or outcome in OUTCOMES, 'unknown verifiedOutcome')
    require(state == 'OBSERVED' or outcome is None, 'non-observed outcome')
    require(record['scope'] in {'PORTABLE', 'ASSEMBLED'}, 'invalid scope')
    require(record['registryApplicability'] == row[5], 'Registry applicability changed')
    decision = record['applicabilityDecision']
    require(type(decision['evaluated']) is bool, 'evaluated must be boolean')
    for key in ['applies', 'selected']:
        require(decision[key] is None or type(decision[key]) is bool,
                key + ' must be boolean or null')
    if not decision['evaluated']:
        require(decision['applies'] is None and decision['selected'] is None,
                'unevaluated decision claims applies/selection')
    if row[5] in {'REQUIRED', 'PROHIBITED'}:
        require(decision['applies'] is not False, 'required/prohibited declared inapplicable')
    if outcome is None:
        return
    require(decision['evaluated'] is True, 'non-null outcome without evaluated decision')
    if row[5] in {'REQUIRED', 'PROHIBITED'}:
        require(decision['applies'] is True, 'required/prohibited needs applies=true')
    elif row[5] == 'CONDITIONAL':
        require(decision['applies'] is (False if outcome == 'NOT_APPLICABLE' else True),
                'outcome contradicts condition decision')
    elif row[5] == 'OPTIONAL':
        require(decision['selected'] is (False if outcome == 'NOT_SELECTED' else True),
                'outcome contradicts selection decision')
    require(record['sourceIdentity'] and record['buildIdentity'], 'source/build identity missing')
    build = record['buildIdentity']
    require(build.get('sourceIdentity') == record['sourceIdentity'], 'build/source mismatch')
    require(re.fullmatch(r'[0-9a-f]{64}', build.get('artifactSha256', '')),
            'build artifact identity missing')
    require(build.get('mode') and build.get('command') and isinstance(build.get('exitCode'), int),
            'build execution evidence missing')
    require(record['scope'] != 'ASSEMBLED' or record['projectIdentity'], 'project identity missing')
    require(record['evidenceRefs'] and record['reviewer'] and record['reviewedAt'],
            'verification refs/reviewer/date missing')
    require(record['verificationOwner'] == row[9], 'Verification Owner mismatch')
    require(record['evidenceBasis'] == 'VERIFICATION_OWNER_DECISION'
            and record['requirementCoverage'] == 'FULL' and record['currentBuildReviewed'] is True,
            'observation/implementation/historical report is not current complete verification')
    reviewed = date.fromisoformat(record['reviewedAt'])
    require(record['reviewer'] != record.get('implementationAuthor'), 'self-verification')
    require(not (record['hasKnownApplicableFailure'] and outcome in {
        'PASS', 'NOT_APPLICABLE', 'NOT_SELECTED'}), 'applicable failure hidden')
    if outcome in {'NOT_APPLICABLE', 'NOT_SELECTED'}:
        expected = 'CONDITIONAL' if outcome == 'NOT_APPLICABLE' else 'OPTIONAL'
        require(row[5] == expected, 'N/A/non-selection not allowed by applicability')
        decision = record['applicabilityDecision']
        require(decision['reason'] and decision['decisionOwner'] and decision['evidenceRefs'],
                'decision evidence missing')
    if outcome == 'EXCEPTION':
        require(row[6] in {'P2', 'NIT'}, 'ordinary P0/P1 exception forbidden')
        exception = record['exception']
        require(exception and all(exception.get(k) for k in [
            'owner', 'gap', 'impact', 'reason', 'evidenceRefs', 'mitigations', 'scope',
            'affectedRoutes', 'expiry', 'releaseGovernanceApproval', 'verificationOwnerAcknowledgment']),
            'exception proof/approval incomplete')
        require(date.fromisoformat(exception['expiry']) >= max(reviewed, date(2026, 10, 1)),
                'exception expired')


def validate_baseline(baseline, registry, identity):
    require(baseline['baselineKind'] == 'WS01_EVIDENCE_INDEX' and baseline['releaseBaseline'] is False,
            'provisional index presented as frozen release baseline')
    records = baseline['records']
    require(len(records) == 41 and baseline['recordCount'] == 41
            and [x['capabilityId'] for x in records] == list(registry), 'baseline coverage/order drift')
    for record in records:
        validate_record(record, registry, identity)
        # This index contains historical observations, with no current candidate build/review.
        require(record['verifiedOutcome'] is None and record['currentBuildReviewed'] is False,
                'historical observations converted to current outcome')
        decision = record['applicabilityDecision']
        require(decision['evaluated'] is False and decision['applies'] is None
                and decision['selected'] is None, 'WS01 index invents current applicability decision')
        for ref in record['evidenceRefs']:
            require((ROOT / ref).is_file(), 'unreadable evidence ref: ' + ref)
    ax = next(x for x in records if x['capabilityId'] == 'AX-01')
    require(ax['evidenceStatus'] == 'OBSERVED' and ax['verifiedOutcome'] is None,
            'A3 AX-01 browser requirement unproven')
    projects = baseline['historicalProjectObservations']
    require(projects['currentVerifiedOutcome'] is None and projects['currentBuildReviewed'] is False,
            'historical project PASS inherited')
    for ref in projects['evidenceRefs']:
        require((ROOT / ref).is_file(), 'historical project evidence missing')


def rejection(name, operation):
    try:
        operation()
    except (ValueError, KeyError):
        print('NEGATIVE PASS: ' + name)
        return
    raise ValueError('negative unexpectedly accepted: ' + name)


def synthetic_record(registry, identity, capability='IA-02', outcome='PASS'):
    """Deliberately synthetic in-memory proof metadata; never written to actual evidence."""
    source = {'testOnly': True, 'commit': '0' * 40, 'tree': '1' * 40}
    return {'capabilityId': capability, 'canonicalContract': deepcopy(identity),
            'sourceIdentity': source, 'buildIdentity': {'sourceIdentity': source,
                'artifactSha256': '2' * 64, 'mode': 'SYNTHETIC_TEST', 'command': 'test fixture', 'exitCode': 0},
            'projectIdentity': None, 'scope': 'PORTABLE',
            'registryApplicability': registry[capability][5],
            'applicabilityDecision': {'evaluated': True,
                'applies': (outcome != 'NOT_APPLICABLE') if registry[capability][5] != 'OPTIONAL' else None,
                'selected': (outcome != 'NOT_SELECTED') if registry[capability][5] == 'OPTIONAL' else None,
                'reason': 'test-only decision',
                'decisionOwner': 'synthetic decision owner', 'evidenceRefs': ['synthetic decision ref']},
            'evidenceStatus': 'OBSERVED', 'verifiedOutcome': outcome,
            'evidenceBasis': 'VERIFICATION_OWNER_DECISION', 'requirementCoverage': 'FULL',
            'verificationOwner': registry[capability][9], 'currentBuildReviewed': True,
            'hasKnownApplicableFailure': False, 'evidenceRefs': ['synthetic test-only ref'],
            'reviewer': 'synthetic independent verifier', 'reviewedAt': '2026-10-01', 'exception': None}


def main():
    provenance = json.loads((EVIDENCE / 'provenance.json').read_text())
    old = PREDECESSOR.read_text()
    text = (SOP / CANONICAL).read_text()
    registry = validate_registry(text, old)
    identity = provenance['canonicalContract']
    baseline = json.loads((EVIDENCE / 'capability-evidence-baseline.json').read_text())
    obligations = baseline['referenceObligations']
    validate_reference(text, old, obligations)
    manifest = json.loads((SOP / 'PACKAGE_MANIFEST.json').read_text())
    reference = json.loads((PROMPT / 'CONTRACT_REFERENCE.json').read_text())
    template = (SOP / 'docs/CAPABILITY_EVIDENCE_TEMPLATE_V2.7.md').read_text()
    template_identity = json.loads(re.findall(r'```json\n(.*?)\n```', template, re.S)[0])
    validate_identity([manifest['canonical_contract'], reference['canonical_contract'],
                       template_identity, baseline['canonicalContract']], identity)
    active_prompt = (PROMPT / 'CodexMasterPrompt_v2.7Candidate.md').read_text()
    validate_single_registry(active_prompt)
    prompt_identity = json.loads(re.findall(r'```json\n(.*?)\n```', active_prompt, re.S)[0])
    validate_identity([prompt_identity], identity)
    require(len(manifest['files']) == manifest['file_count'] == len(set(manifest['files'])),
            'manifest file_count/duplicates')
    for path in manifest['files']:
        require((SOP / path).is_file(), 'manifest missing file: ' + path)
    actual_sop = {str(x.relative_to(SOP)) for x in SOP.rglob('*') if x.is_file()
                  and '.git' not in x.relative_to(SOP).parts}
    require(actual_sop == set(manifest['files']), 'manifest actual file set mismatch')
    require(manifest['current_methodology_authority'] == 'docs/NEW_GAME_SITE_SOP_v2.7.md',
            'wrong active methodology')
    frozen_manifest = json.loads((ROOT / 'Repo_hotgameweb/GAME_SOP_V2.6.5/PACKAGE_MANIFEST.json').read_text())
    require(manifest['based_on'] == frozen_manifest['based_on'], 'historical release provenance overwritten')
    validate_baseline(baseline, registry, identity)
    print('POSITIVE PASS: 41 original rows/16 columns, V/W verbatim, 30-file package, exact identities, honest evidence index')

    lines = registry_lines(text)
    row_lines = [x for x in lines if CAP_ROW.match(x)]
    rejection('deleted capability', lambda: validate_registry(text.replace(row_lines[0] + '\n', '', 1), old))
    rejection('duplicate capability', lambda: validate_registry(text.replace(row_lines[0], row_lines[1], 1), old))
    for column in range(16):
        cells = row_lines[0].strip('|').split('|')
        cells[column] += ' altered'
        altered = '|' + '|'.join(cells) + '|'
        rejection('changed Registry column ' + str(column + 1),
                  lambda altered=altered: validate_registry(text.replace(row_lines[0], altered, 1), old))
    rejection('new changeType column', lambda: validate_registry(
        text.replace(lines[0], lines[0] + ' changeType |', 1), old))
    rejection('WS-01 as capability', lambda: validate_registry(text.replace('| GI-01 |', '| WS-01 |', 1), old))
    rejection('Prompt second Registry', lambda: validate_single_registry(active_prompt + '\n' + '\n'.join(lines)))
    for key, value in [('sha256', '0' * 64), ('canonicalPath', 'other.md'), ('owningArtifact', 'STARTER')]:
        altered = deepcopy(identity)
        altered[key] = value
        rejection('identity ' + key, lambda altered=altered: validate_identity([altered], identity))
    altered = deepcopy(obligations)
    altered['realProjectCoverageSubstitutesReferencePass'] = True
    rejection('PROJECT-WOG replaces REF-A', lambda: validate_reference(text, old, altered))
    for ref in ['REF-A', 'REF-B', 'REF-C']:
        altered = deepcopy(obligations)
        del altered['referenceArchetypes'][ref]
        rejection('missing ' + ref, lambda altered=altered: validate_reference(text, old, altered))
    for state, outcome in [('PENDING', 'PASS'), ('NOT_RUN', 'FAIL'), ('UNVERIFIED', 'NOT_APPLICABLE')]:
        record = synthetic_record(registry, identity)
        record.update(evidenceStatus=state, verifiedOutcome=outcome)
        rejection(state + ' + ' + outcome, lambda record=record: validate_record(record, registry, identity))
    for outcome in ['PENDING', 'BLOCK', 'REVISE', 'NOT_RUN', 'CONDITIONAL_PASS']:
        record = synthetic_record(registry, identity, outcome=outcome)
        rejection('invalid outcome ' + outcome, lambda record=record: validate_record(record, registry, identity))
    for outcome in ['EXCEPTION', 'NOT_APPLICABLE', 'NOT_SELECTED']:
        record = synthetic_record(registry, identity, outcome=outcome)
        rejection('required P1 as ' + outcome, lambda record=record: validate_record(record, registry, identity))
    for key in ['evidenceRefs', 'reviewer', 'reviewedAt', 'sourceIdentity', 'buildIdentity']:
        record = synthetic_record(registry, identity)
        record[key] = None
        rejection('missing ' + key, lambda record=record: validate_record(record, registry, identity))
    record = synthetic_record(registry, identity)
    record['buildIdentity']['sourceIdentity'] = {'wrongSource': True}
    rejection('reviewed build/source mismatch', lambda: validate_record(record, registry, identity))
    for key, value in [('evidenceBasis', 'IMPLEMENTATION_ACCEPTED'), ('requirementCoverage', 'PARTIAL'),
                       ('currentBuildReviewed', False), ('hasKnownApplicableFailure', True)]:
        record = synthetic_record(registry, identity)
        record[key] = value
        rejection('false PASS: ' + key, lambda record=record: validate_record(record, registry, identity))
    altered_baseline = deepcopy(baseline)
    ax = next(x for x in altered_baseline['records'] if x['capabilityId'] == 'AX-01')
    ax.update(synthetic_record(registry, identity, 'AX-01'))
    rejection('A3 AX-01 promoted to PASS', lambda: validate_baseline(altered_baseline, registry, identity))
    altered_baseline = deepcopy(baseline)
    altered_baseline['historicalProjectObservations']['currentVerifiedOutcome'] = 'PASS'
    rejection('historical project PASS inherited', lambda: validate_baseline(altered_baseline, registry, identity))

    for capability, outcomes, field in [
        ('MC-01', ['PASS', 'FAIL', 'NOT_APPLICABLE'], 'applies'),
        ('ID-02', ['PASS', 'FAIL', 'NOT_SELECTED'], 'selected')]:
        for outcome in outcomes:
            for value in [None, outcome not in {'PASS', 'FAIL'}]:
                record = synthetic_record(registry, identity, capability, outcome)
                record['applicabilityDecision'][field] = value
                rejection(f'{capability} {outcome} with {field}={value}',
                          lambda record=record: validate_record(record, registry, identity))
    prohibited = next(k for k, row in registry.items() if row[5] == 'PROHIBITED')
    for capability in ['IA-02', prohibited]:
        for outcome in ['PASS', 'FAIL']:
            for value in [False, None]:
                record = synthetic_record(registry, identity, capability, outcome)
                record['applicabilityDecision']['applies'] = value
                rejection(f'{capability} {outcome} with applies={value}',
                          lambda record=record: validate_record(record, registry, identity))
    for capability, outcome in [('IA-02', 'PASS'), ('MC-01', 'PASS'),
                                ('MC-01', 'NOT_APPLICABLE'), ('ID-02', 'PASS'),
                                ('ID-02', 'NOT_SELECTED'), (prohibited, 'PASS')]:
        record = synthetic_record(registry, identity, capability, outcome)
        record['applicabilityDecision'].update(evaluated=False, applies=None, selected=None)
        rejection(f'{capability} {outcome} without evaluation',
                  lambda record=record: validate_record(record, registry, identity))
    for capability, outcome in [('MC-01', 'NOT_APPLICABLE'), ('ID-02', 'NOT_SELECTED')]:
        for key, value in [('reason', None), ('decisionOwner', None), ('evidenceRefs', [])]:
            record = synthetic_record(registry, identity, capability, outcome)
            record['applicabilityDecision'][key] = value
            rejection(f'{outcome} missing decision {key}',
                      lambda record=record: validate_record(record, registry, identity))
    for key, value in [('evaluated', 'true'), ('applies', 1), ('selected', 'false')]:
        record = synthetic_record(registry, identity)
        record['applicabilityDecision'][key] = value
        rejection('decision type ' + key, lambda record=record: validate_record(record, registry, identity))
    record = synthetic_record(registry, identity)
    record['registryApplicability'] = 'CONDITIONAL'
    rejection('category differs from Registry', lambda: validate_record(record, registry, identity))
    altered_baseline = deepcopy(baseline)
    altered_baseline['records'][0]['applicabilityDecision'].update(evaluated=True, applies=True)
    rejection('WS01 invented project decision', lambda: validate_baseline(altered_baseline, registry, identity))

    for state in sorted(STATES):
        record = synthetic_record(registry, identity)
        record.update(evidenceStatus=state, verifiedOutcome=None)
        validate_record(record, registry, identity)
    for outcome in ['PASS', 'FAIL']:
        validate_record(synthetic_record(registry, identity, outcome=outcome), registry, identity)
    for capability, outcome in [('MC-01', 'NOT_APPLICABLE'), ('ID-02', 'NOT_SELECTED')]:
        validate_record(synthetic_record(registry, identity, capability, outcome), registry, identity)
    for capability in ['MC-01', 'ID-02', prohibited]:
        for outcome in ['PASS', 'FAIL']:
            validate_record(synthetic_record(registry, identity, capability, outcome), registry, identity)
    exception_record = synthetic_record(registry, identity, 'HR-02', 'EXCEPTION')
    exception_record['exception'] = {k: 'synthetic only' for k in [
        'owner', 'gap', 'impact', 'reason', 'evidenceRefs', 'mitigations', 'scope', 'affectedRoutes',
        'releaseGovernanceApproval', 'verificationOwnerAcknowledgment']}
    exception_record['exception']['expiry'] = '2026-10-02'
    validate_record(exception_record, registry, identity)
    exception_record['exception']['expiry'] = '2026-09-30'
    rejection('expired P2 exception', lambda: validate_record(exception_record, registry, identity))
    print('POSITIVE PASS: 15 synthetic state/outcome decision combinations; no synthetic evidence written')

    for relative, expected in provenance['sourcePreflight'].items():
        path = ROOT / relative
        require(git(path, 'rev-parse', 'HEAD') == expected['head'], 'source HEAD changed')
        require(git(path, 'rev-parse', 'HEAD^{tree}') == expected['tree'], 'source tree changed')
        require(git(path, 'status', '--porcelain=v1', '--untracked-files=all') == '', 'source dirty')
        require(git(path, 'for-each-ref', '--format=%(refname):%(objectname)', 'refs/heads')
                == expected['branches'], 'source branches changed')
        require({f: fingerprint(path / f) for f in expected['files']} == expected['files'],
                'source file hash/mode changed')
    excluded = set(provenance['snapshotExclusions'])
    protected = {}
    for relative in provenance['protectedTreeRoots']:
        for base, dirs, names in os.walk(ROOT / relative):
            dirs[:] = [d for d in dirs if d not in excluded]
            for name in names:
                if name.startswith('.env'):
                    continue
                path = Path(base) / name
                protected[str(path.relative_to(ROOT))] = fingerprint(path)
    require(protected == provenance['protectedFileSnapshot'], 'real project/reference source/assets changed')
    require(not (ROOT / 'Repo_hotgameweb/GAME_SITE_SYSTEM_V2.7').exists(), 'assembly created too early')
    for relative, candidate in provenance['candidates'].items():
        path = ROOT / relative
        require(git(path, 'rev-parse', 'HEAD') == candidate['sourceBaselineCommit'], 'new candidate commit')
        require(git(path, 'rev-parse', 'HEAD^{tree}') == candidate['sourceBaselineTree'], 'candidate base drift')
        require(git(path, 'branch', '--show-current') == 'v2.7/normative-foundation', 'candidate branch mismatch')
        require(not (path / '.git/objects/info/alternates').exists(), 'source object dependency')
        require(not (path / 'node_modules').exists(), 'candidate dependency installation')
        subprocess.run(['git', '-C', str(path), 'merge-base', '--is-ancestor',
                        candidate['sourceBaselineCommit'], 'HEAD'], check=True)
        subprocess.run(['git', '-C', str(path), 'diff', '--check'], check=True)
    # Every inherited file except the explicit SOP modifications must remain byte/mode identical.
    allowed = {'README.md', '新手必读.md', 'CHANGELOG.md', 'PACKAGE_MANIFEST.json',
               'docs/EXECUTION_PROMPT.md', 'docs/PROJECT_BRIEF_TEMPLATE.md',
               'docs/CURRENT_STATUS_TEMPLATE.md', 'docs/QA_CHECKLIST.md'}
    for relative, candidate in provenance['candidates'].items():
        path = ROOT / relative
        for f, expected in provenance['sourcePreflight'][candidate['sourcePath']]['files'].items():
            if path == SOP and f in allowed:
                continue
            require(fingerprint(path / f) == expected, 'unapproved inherited file change: ' + f)
    require({str(x.relative_to(PROMPT)) for x in PROMPT.rglob('*') if x.is_file()
             and '.git' not in x.relative_to(PROMPT).parts}
            == set(provenance['sourcePreflight'][provenance['candidates'][str(PROMPT.relative_to(ROOT))]
                   ['sourcePath']]['files']) | {'README.md', 'CONTRACT_REFERENCE.json', 'CodexMasterPrompt_v2.7Candidate.md'},
            'Prompt file scope exceeded')
    for path in [SOP / f for f in manifest['files'] if f.endswith('.md')] + [PROMPT / 'README.md']:
        for target in re.findall(r'\]\(([^)]+)\)', path.read_text()):
            if not re.match(r'^[a-z]+://', target) and not target.startswith('#'):
                require((path.parent / target.split('#')[0]).exists(), 'broken local link: ' + target)
    print('PROTECTION PASS: 4 exact CLEAN sources; 743 protected files; predecessor hash; candidates lineage/scope; no new Starter branch/dependencies/assembly/commits')
    print('WS-01 CHECK PASS. This is method/package validation, not V2.7 product/release acceptance.')


if __name__ == '__main__':
    main()
