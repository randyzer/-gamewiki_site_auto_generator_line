# Output Contract

Create these files under the target site's `docs/` directory.

## `DEPLOYMENT_PLAN.md`

Before confirmation, this is the complete proposed plan. Include:

- Project/repository/branch/commit and working-tree status.
- GitHub remote/upstream state (ahead/behind/diverged), exact pending files, proposed commit message, push destination, and whether the push triggers deployment; include this section only when Git synchronization is needed.
- Architecture findings and evidence.
- Recommended provider and fallback.
- Build settings, preview/test result, and required environment variables.
- Account/project name; domain registrar; authoritative DNS provider/nameservers; current production host; production domain, canonical host, redirects, and exact DNS changes, including records that must be preserved.
- GSC and GA4 setup steps and required access.
- Costs/quotas, uncertainties, risks, rollback method, and exact confirmation request.

Update this file after execution with actual values and changes. Never write credentials or secret values into the plan.

## `DEPLOYMENT_PLAN.json`

Use UTF-8 JSON with this minimal structure:

```json
{
  "schema_version": 1,
  "status": "AWAITING_CONFIRMATION",
  "project": {
    "path": "/absolute/project/path",
    "repository": "",
    "branch": "",
    "commit": "",
    "working_tree": "CLEAN"
  },
  "github_sync": {
    "needed": false,
    "remote": "",
    "target_branch": "",
    "upstream_state": "IN_SYNC",
    "files_to_commit": [],
    "commit_message": "",
    "push_authorized": false,
    "push_triggers_production_deploy": false,
    "local_commit": "",
    "remote_commit": ""
  },
  "architecture": {
    "framework": "",
    "runtime": "STATIC",
    "build_command": "",
    "output_directory": "",
    "evidence": []
  },
  "hosting": {
    "recommended_provider": "",
    "fallback_provider": "",
    "account_or_team": "",
    "project_name": "",
    "reason": ""
  },
  "domain": {
    "registrar": "",
    "dns_provider": "",
    "nameservers": [],
    "current_host": "",
    "production_origin": "",
    "canonical_origin": "",
    "redirects": [],
    "existing_records_reviewed": false,
    "dns_changes": []
  },
  "budget_preference": "",
  "confirmation": {"status": "AWAITING_CONFIRMATION", "confirmed_at": null},
  "measurement": {
    "gsc_property": "",
    "sitemap_url": "",
    "ga4_property": "",
    "measurement_id_configured": false
  },
  "checks": [],
  "risks": [],
  "rollback": []
}
```

Allowed statuses: `DRAFT`, `AWAITING_CONFIRMATION`, `APPROVED`, `DEPLOYED`, `PARTIAL`, `BLOCKED`, `CANCELLED`.

## `DEPLOYMENT_REPORT.md` and `DEPLOYMENT_REPORT.json`

Create after execution. Record:

- Approved plan reference and the user's confirmation point.
- Actual provider, account/project, repository branch and deployed commit.
- GitHub synchronization result: files committed, commit message, pushed branch, local/remote commit IDs, and any blocked or omitted files. Record `NOT NEEDED`, `COMMITTED AND PUSHED`, `BLOCKED`, or `NOT AUTHORIZED` distinctly.
- Build, preview, production URL, HTTPS, route, redirect, robots, sitemap, and canonical checks.
- DNS records changed (type/name/value/previous value/status), excluding secrets.
- GSC property verification, sitemap submission response/status, URL Inspection and indexing-request status.
- GA4 tag detection and Realtime status.
- Costs/quotas confirmed, unresolved issues, and rollback instructions.

Represent each service state separately:

- Deployment: `NOT STARTED`, `PREVIEW VERIFIED`, `PRODUCTION LIVE`, `FAILED`.
- GSC ownership: `NOT CONFIGURED`, `VERIFIED`, `BLOCKED`.
- Sitemap: `NOT SUBMITTED`, `SUBMITTED`, `ERROR`, `BLOCKED`.
- Indexing: `NOT CHECKED`, `REQUEST SUBMITTED`, `INDEXED`, `NOT INDEXED`, `UNKNOWN`.
- GA4: `NOT CONFIGURED`, `TAG DETECTED`, `DATA RECEIVED`, `ERROR`, `BLOCKED`.

A submitted indexing request is not an indexed result. A detected tag is not proof that meaningful analytics events are arriving.
