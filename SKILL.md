---
name: beaver-relay
description: Turn any readable/writable workspace plus versioned history into a persistent operating environment for AI agents. Use when an agent needs to continue work across sessions, models, or tools without making the user restate context; restore current state, decide the next action, execute, verify, write back, and leave an auditable handoff for the next agent.
---

# Beaver Relay

## Purpose

Create a persistent working brain outside any single chat, model, or AI product.

The system has four roles:

1. **Workspace** — human-readable source of truth.
2. **Version / Audit Layer** — history, diffs, rollback, attribution.
3. **Agent** — restores state, decides, acts, verifies, writes back.
4. **State Contract** — shared rules that let different agents understand the same workspace.

Platforms are replaceable.

Examples:

- Workspace: Obsidian, Notion, Markdown folders, Google Drive, databases.
- Version layer: GitHub, GitLab, Bitbucket, local Git, snapshot/event-log systems.
- Agent: ChatGPT, Claude, Codex, Cursor, local agents, custom agents.

Do not bind the workflow to a specific vendor unless the user explicitly asks.

---

# Core promise

> Never start from zero.

A returning or replacement agent should be able to:

- know what the user is trying to achieve;
- know what has already been done;
- know what is verified versus assumed;
- know the current blocker;
- know the one best next action;
- continue without making the user retell the project;
- leave the workspace in a state another agent can resume.

The long-term state must live outside the chat.

---

# Capability requirements

A workspace backend should provide as many of these as possible:

- `read` — retrieve authoritative state and source material;
- `search` — find relevant history or project records;
- `write` — update persistent state;
- `stable_id` — keep references valid across sessions.

A version backend should provide:

- `history` — what changed and when;
- `diff` — what changed between versions;
- `rollback` — restore a known-good state;
- `attribution` — identify the change source when possible.

If one platform provides both workspace and history, that is acceptable.

If a capability is missing, continue with degraded mode and state the limitation. Do not pretend rollback or auditability exists when it does not.

---

# State Contract

Every active project or ongoing workstream should expose a compact current-state record.

Use this logical schema even if the actual platform uses pages, properties, JSON, tables, or Markdown:

```yaml
project:
  name: <name>
  goal: <current outcome>

current:
  status: <where things stand now>
  blocker: <single main blocker or null>
  task: <what is actively being worked on>
  next: <one concrete next action>

decisions:
  - <confirmed decision or constraint>

sources_of_truth:
  - <authoritative file/page/object and what it owns>

verified:
  - <facts confirmed by direct evidence>

unknowns:
  - <important unresolved items; never guess these>

recent_changes:
  - <short recent change with evidence/version reference>

updated_at: <timestamp if available>
```

The physical format may vary.

The semantics must not.

---

# Source-of-truth rule

Each important fact should have one authoritative home.

Examples:

- project status belongs in the project state;
- product specification belongs in the product spec;
- raw source material belongs in the archive/source area;
- reusable experience belongs in an experience layer;
- chat history is evidence, not automatically the source of truth.

Do not maintain competing copies of the same truth in multiple places.

Prefer links/references over duplicated text.

If sources conflict:

1. do not merge them by guess;
2. mark the conflict;
3. prefer direct current evidence over summaries;
4. leave unresolved items as `UNKNOWN` until verified.

---

# First-run bootstrap

When this skill is first used on an existing workspace:

## 1. Discover available backends

Determine:

- what persistent workspace the agent can read/write;
- what version/history backend is available;
- what projects or workstreams already exist;
- what actions require user authorization.

Do not ask the user to describe information that can be discovered directly.

Ask only for missing access or a decision that cannot be inferred safely.

## 2. Find the real source material

Before creating new control files/pages:

- inspect existing project state, docs, notes, tasks, and history;
- identify existing sources of truth;
- reuse them when possible.

Do not create a parallel management system if the workspace already contains one.

## 3. Create only the missing minimum

If no usable current-state record exists, create one minimal state object using the State Contract.

Do not generate a large folder tree, many templates, or documentation merely because the skill was installed.

Minimum viable control layer:

```text
Current State
Decisions / Constraints
Source Index (only if retrieval needs it)
```

Add more structure only when real use proves necessary.

## 4. Establish the initial NEXT

After reading the workspace:

- reconstruct current goal;
- reconstruct verified progress;
- identify the main blocker;
- choose one concrete next action.

If evidence is insufficient, set `UNKNOWN` rather than inventing continuity.

---

# Operating loop

Use this loop for ongoing work:

```text
RESTORE
→ DECIDE
→ ACT
→ VERIFY
→ WRITE BACK
→ VERSION
→ HAND OFF
```

## RESTORE

Before acting on an existing project:

1. read Current State;
2. read relevant confirmed decisions;
3. inspect only the minimum source material needed;
4. check recent history/diff if the state may be stale;
5. reconstruct a compact working brief.

Do not load the whole workspace by default.

## DECIDE

Determine:

- whether the user request changes the project goal;
- whether it repeats work already completed;
- whether it belongs in the current project or should be parked;
- the single best next action.

Prefer continuation over restarting.

## ACT

Execute as much as the available tools and authorization allow.

Do not hand routine work back to the user merely because the system is persistent.

Ask the user only when:

- authorization is required;
- the action is irreversible/high impact;
- two valid directions require user preference;
- necessary information is genuinely unavailable.

## VERIFY

Do not treat agent output as proof.

Verify against the real artifact, system, file, UI, test, response, or user-confirmed outcome.

Keep these distinct:

- `implemented`
- `verified`
- `released`
- `validated by real-world outcome`

Do not collapse them into one word such as “done”.

## WRITE BACK

After a meaningful change, update persistent state automatically.

Write back only what changed:

- status;
- blocker;
- confirmed decision;
- verification result;
- next action;
- important unknown.

Do not rewrite the whole workspace after every turn.

## VERSION

When a version backend exists:

- save meaningful state/content changes;
- use concise change messages;
- preserve history;
- never expose secrets in commit messages or logs.

Do not create noisy versions for trivial conversational turns.

## HAND OFF

Leave enough state that another agent can continue without asking:

> “What were we doing?”

A handoff is successful when a fresh agent can identify the correct next action from the persistent workspace alone.

---

# Cross-agent continuity

Assume the next agent may be:

- a different model;
- a different vendor;
- running in a different chat;
- using different tools.

Therefore:

- never rely on hidden chat memory as the only copy of important state;
- never use model-specific shorthand as the only explanation;
- use plain, durable terms in persistent records;
- reference actual sources and evidence;
- record unresolved uncertainty explicitly.

The workspace belongs to the user, not to the current agent.

---

# Human visibility

Persistence must increase user control, not hide agent behavior.

The user should be able to inspect:

- current state;
- decisions;
- what changed;
- evidence;
- history;
- the next planned action.

Default interaction style:

- maintain state silently when changes are routine and authorized;
- report material changes compactly;
- surface conflicts, irreversible actions, permission changes, and important uncertainty.

Do not require the user to manually maintain the agent's memory system.

---

# Automation principle

The user should be able to progressively let go.

As the system becomes reliable, the agent should need fewer repeated instructions.

Automation should focus on:

- restoring state automatically;
- detecting stale state;
- updating current state after verified changes;
- indexing newly added source material when useful;
- preserving version history;
- recalling only relevant prior context;
- carrying the correct NEXT across sessions.

Do not automate authority expansion.

A system becoming more experienced does not gain permission to perform actions the user did not authorize.

---

# Optional experience layer

A persistent workspace may maintain reusable experience, but experience is secondary to continuity.

Use this hierarchy:

```text
Current facts
→ current decision
→ action
→ verified outcome
→ reusable experience candidate
```

Never let an old experience rule override current evidence.

If an experience system is present, it should support:

- conditions for use;
- validation;
- counterexamples;
- downgrade/deprecation;
- preserved history.

Do not make experience bookkeeping block execution.

---

# Archive and recall

Raw historical material may be large.

Treat archives as evidence, not active context.

Preferred recall flow:

```text
Current State
→ current cue/task
→ search archive/index
→ retrieve only relevant source
→ build temporary working brief
→ act
```

Do not dump the entire archive into the model.

If an index exists, use it to locate sources; the index does not replace the source itself.

---

# Change safety

Before destructive or high-impact writes:

1. confirm the target;
2. check current version/state;
3. confirm authorization;
4. preserve a rollback path when possible.

Examples requiring extra care:

- deletion;
- overwriting authoritative source material;
- changing permissions or visibility;
- deployment/production changes;
- replacing user-authored creative work;
- rewriting history.

Routine state maintenance does not require repeated confirmation when already authorized.

---

# Anti-patterns

Avoid these:

## Chat as database

Important state exists only in conversation history.

Why it fails:
- session/model changes break continuity;
- the user must repeat context.

## Memory dump

Load every note on every task.

Why it fails:
- retrieval becomes noisy;
- old conclusions dominate current facts;
- cost and latency increase.

## Parallel truth

The same status is maintained independently in several places.

Why it fails:
- copies drift;
- agents do not know which one is current.

## Documentation theater

The agent spends more time maintaining the system than doing the work.

Why it fails:
- persistence becomes user overhead.

## “Done” without evidence

The agent reports completion because it wrote code or text.

Why it fails:
- implementation is confused with verification.

## Platform lock-in

The protocol only works with one note app, one Git host, or one AI vendor.

Why it fails:
- the user's long-term state becomes dependent on a replaceable tool.

---

# Minimal output contract

For ordinary continuation, do not narrate the whole protocol.

A compact status is enough:

```text
Restored: <project / workstream>
Verified state: <one sentence>
Next: <one concrete action>
```

After meaningful execution:

```text
Changed: <what materially changed>
Verified: <evidence>
Persisted: <where>
Next: <one concrete action>
```

Only expose internal maintenance details when they matter or the user asks.

---

# Success test

This skill is working if:

1. the user can leave and return later without restating the project;
2. another agent/model can continue from the workspace;
3. the user can see what the agent changed;
4. incorrect changes can be traced and, where supported, rolled back;
5. current evidence beats stale memory;
6. the system preserves one clear next action;
7. maintaining persistence creates less work for the user, not more.

The strongest test:

> Give the workspace to a fresh agent with no prior chat context.  
> If it can correctly explain the current state and take the right next action, continuity is working.
