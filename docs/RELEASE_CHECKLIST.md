# v0.1 release checklist

TASK-014 prepares the repository at 0.0.1; it does not publish. Checked evidence
is a dated snapshot, not a permanent guarantee. Recheck package-name
availability and changes since the audit before release. See
[readiness](V0_1_READINESS.md).

## Repository

- [ ] Clean working tree after the release-preparation commit.
- [x] Public documentation reviewed for implemented behavior and PRE-ALPHA
      status.
- [x] Tracked files/history scanned; no known committed credentials.
- [x] Current public documents use portable paths; research history retained.
- [x] MIT license, security policy, contributing guide, and Code of Conduct
      reviewed.
- [ ] Actual GitHub Linux/Windows CI green on the release commit.
- [ ] Enable private vulnerability reporting and confirm the reporting channel.

## Package

- [x] TASK-014 0.0.1 dry-run and tarball inspected; 85 allowed files, no
      maps/tests/secrets.
- [x] TASK-014 temporary Windows npm install and harmless CLI/ESM smoke passed.

- [x] `vornariq` registry lookup returned E404 on 2026-10-05; no public
      collision found.
- [ ] Final package dry-run inspected after release build.
- [ ] Installed tarball CLI help/version smoke passes on the release artifact.
- [ ] Version updated from 0.0.1 to 0.1.0 in package and public identity
      metadata.
- [ ] Matching version assertions and lockfile updated where necessary.
- [ ] Changelog finalized for the actual release.
- [ ] Real repository, bugs, and homepage metadata configured after URL exists.

## Providers

- [x] Codex CLI 0.154.0 compatibility verified on Windows in prior validation.
- [x] Codex authenticated read-only E2E verified in the TASK-014 supplied
      record.
- [x] Gemini CLI 0.62.0 compatibility and authentication limitations documented.
- [x] Antigravity not exposed; security-blocked research clearly labeled.
- [x] Automated tests use fake providers or harmless local processes, never live
      models.

Gemini API-key/enterprise live E2E remains pending separate authorization; it is
not a blocker to public PRE-ALPHA repository preparation. No automatic provider
revalidation or paid calls are authorized by this checklist.

## Release — TASK-015, separately authorized

- [ ] Public GitHub repository created with intended owner/name.
- [ ] Release-preparation commit pushed and CI verified.
- [ ] Version tag created on the verified release commit.
- [ ] GitHub release created.
- [ ] npm publication completed using the intended account.
- [ ] Post-publication install and harmless CLI smoke verified.

Never tick publication, hosted CI, or live-provider gates based only on a local
build. Do not include credentials, raw provider logs, or personal paths in
evidence.
