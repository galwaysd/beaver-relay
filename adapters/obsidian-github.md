# Obsidian + GitHub Adapter

This adapter shows how Beaver Relay can run on a Markdown/Obsidian workspace with GitHub as the version and audit layer.

It is an example mapping, not a required folder structure.

## Role mapping

| Beaver Relay role | Obsidian + GitHub example |
|---|---|
| Workspace | Obsidian vault / Markdown files |
| Version / Audit | GitHub repository and commit history |
| Agent | ChatGPT, Claude, Codex, Cursor, or another agent with repository access |
| State Contract | Current-state note plus a small number of linked authoritative sources |

The repository structure belongs to the user. Do not rename or reorganize folders merely to match Beaver Relay.

## Minimal project mapping

A project only needs enough durable state to answer:

- What is the goal?
- What is true now?
- Where did work stop?
- What is the next physical action?
- What decisions are fixed?
- Which files are authoritative?
- What remains unknown?

A practical Markdown shape is:

```text
project/
  current-state.md
  next.md                # optional if next action is already in current-state
  decisions.md           # optional when decisions are large enough to deserve a source
  source material...
```

Existing vaults should reuse their current structure.

## Current-state example

```yaml
project:
  name: Example
  goal: Ship a working public beta

current:
  status: Upload flow works locally
  blocker: Production upload returns 403
  task: Diagnose production upload
  next: Compare production request with the last local success

focus:
  current: Production upload failure
  interruption_point: Confirmed local success; production request still fails
  next_physical_action: Open the production request log and compare headers
  why_next: The failure is environment-specific and the request difference is still unknown
  parked_ideas:
    - Redesign uploader later

decisions:
  - Do not redesign UI during this debugging pass

sources_of_truth:
  - current-state.md — current project state
  - src/upload.ts — upload implementation
  - production log — runtime evidence

verified:
  - Local upload passes
  - Production upload returns 403

unknowns:
  - Which production request difference causes the 403
```

## Resume flow

When a new session or agent takes over:

1. read the current-state note;
2. read the focus block;
3. inspect only the authoritative source needed for the next physical action;
4. check recent Git history if the state may be stale;
5. act;
6. verify the real outcome;
7. update the current state and focus block;
8. commit only meaningful changes.

Do not start with a full-vault scan.

## Side ideas

When a useful idea appears during active work, park it instead of automatically changing the current task.

Example:

```text
parked_ideas:
- Consider a new onboarding flow after the upload bug is verified fixed.
```

A parked idea is not a decision and not a new NEXT.

## Knowledge lifecycle

Use these as semantic states, not mandatory folders:

- `archive` — old evidence, experiments, superseded approaches;
- `active` — current facts, constraints, state, rules;
- `reusable` — methods or experience that can be conditionally reused.

An Obsidian vault may represent these with folders, properties, links, status fields, or an existing structure. Do not move files solely for conceptual neatness.

## Git safety

Git provides history and rollback, but it does not grant authority.

- A past commit is evidence, not permission.
- A reusable experience cannot authorize push, deploy, deletion, or visibility changes.
- Before destructive/high-impact writes, confirm the target and authorization.
- Avoid noisy commits for conversational or trivial state changes.

## Optional experience layer

If the vault already has a reusable experience system, Beaver Relay can read it conditionally.

The core resume loop must still work without it.

Current evidence always outranks old experience.
