# Local Workspace + Git Evidence Adapter

Optional Beaver Relay adapter for agents with **direct local filesystem access and a command runner** (for example, Codex working in a checked-out repository). It adds evidence about the current working tree; it does not change the State Contract or create another project manager.

## Capability boundary

- A compatible agent may inspect tracked files, uncommitted edits, untracked files, and local test results **only within workspaces it is authorized to access**.
- A chat-only agent with no local filesystem bridge cannot see uncommitted files. It must say `local evidence unavailable`, read what it can from the persisted workspace, and never substitute remote Git history for the live working tree.
- No new tunnel, MCP server, vendor account, daemon, or Git hosting integration is required when the agent already has these local capabilities.
- A reachable remote repository is **not** proof that the live local working tree matches it.

## Determine the right workspace

1. Restore Beaver Relay's current project and authoritative state record first. Use its existing workspace/repository path; do not infer a path from a previous unrelated project.
2. Confirm the repository root with `git -C "<workspace>" rev-parse --show-toplevel`. If the expected directory or Git worktree is missing, stop local inspection and mark it `UNKNOWN`.
3. Check which branch and worktree are actually active. Do not assume `main`, the default branch, or a clean checkout.
4. Read only files relevant to the current task. Git output may contain sensitive paths/content; apply existing ignore/secret policies and omit protected values from notes and chat.

## Evidence collection (read-only)

Run from the confirmed repository (replace `<workspace>` with the actual local path):

```shell
git -C "<workspace>" status --short --untracked-files=all
git -C "<workspace>" branch --show-current
git -C "<workspace>" rev-parse HEAD
git -C "<workspace>" diff --no-ext-diff --stat
git -C "<workspace>" diff --no-ext-diff --name-only
git -C "<workspace>" diff --cached --no-ext-diff --name-only
git -C "<workspace>" ls-files --others --exclude-standard
```

Then, **only when needed**:

- Use `git -C "<workspace>" diff --no-ext-diff -- "<relevant-path>"` to read unstaged tracked changes.
- Use `git -C "<workspace>" diff --cached --no-ext-diff -- "<relevant-path>"` for staged changes.
- Read relevant untracked files directly from the working tree: `git diff` does **not** include untracked file contents.
- Inspect actual working-tree files rather than concluding that the HEAD version is current. A clean `git diff` does not by itself prove everything is committed.
- Keep large diffs out of persistent state. Record a short finding plus an evidence reference (path, Git SHA, test-log path) instead.
- Do not send secrets, credentials, `.env*` contents, or entire private file bodies to an external record.

## Test evidence

1. Check for existing test reports or prior command records, explicitly marking them **historical**.
2. To claim a **fresh pass**, run only a known, relevant, non-destructive test command in the confirmed working tree. Determine commands from the actual project scripts/configuration; do not invent one.
3. Record: command, working directory, execution time when available, process exit code, outcome, and log/report location if any. Distinguish `PASS`, `FAIL`, `NOT_RUN`, and `UNKNOWN`.
4. A historical success, test-start message, or agent assertion never counts as a fresh passing test. An unavailable terminal means `NOT_RUN` / `UNKNOWN`, not `PASS`.
5. Some test scripts mutate files or call external systems. Inspect the script or request authorization before running such a command. Do not run deployment, database mutation, destructive cleanup, or arbitrary install scripts just to gather evidence.

For Bunana, use the real checked-out path `D:\Codex\小布\bunana-v2` only after confirming it exists and belongs to the requested task. `tsc --noEmit` is a candidate check only if the repository's actual toolchain is available; never report a pass before observing its exit code.

## Connect to the Beaver Relay loop

- **RESTORE:** read the authoritative Current State, then sample local status/diff only if recency or the next action depends on on-disk changes. Prefer the latest **verified** working-tree evidence over stale summaries.
- **DECIDE / ACT:** use this evidence to choose the next physical action; do not silently overwrite or discard another agent's dirty tree.
- **VERIFY:** compare intended change, relevant current file contents, staged/unstaged diff, untracked files, and fresh test result if executed. Check that no unrelated edits were claimed as part of the work.
- **WRITE BACK:** update the **existing** Current State with only the changed verified facts, blocker, evidence pointer, interruption point, and one next physical action. Never create a competing state file or copy raw diffs into Obsidian.
- **VERSION / HAND OFF:** preserve the existing audit trail when authorized. Reference the actual commit if one exists, and say explicitly if changes remain uncommitted. A local verification is not a release.

## Safety and degraded operation

Local inspection is read-only by default: **no automatic `git add`, `commit`, `push`, `stash`, `reset`, `clean`, `checkout`, or force operations**. These require explicit task authority and existing Beaver Relay change-safety checks. Avoid changing files merely to inspect them. If local access or test execution fails, persist the limitation as `UNKNOWN` with a concrete next step instead of inventing evidence.

The adapter is a protocol, **not a running agent, daemon, or automatic scheduler**. An installed Skill has effect only when an agent loads and follows it; unattended checks and write-back require separately configured execution, access, and triggers.
