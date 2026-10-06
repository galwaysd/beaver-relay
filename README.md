# Beaver Relay

**Your agent can leave. The work stays.**

Beaver Relay is an attention-friendly, platform-agnostic skill for persistent AI work across interruptions, sessions, models, and tools.

It connects four roles:

```text
Workspace
+ Versioned History
+ Agent
+ State Contract
```

The workspace can be Obsidian, Notion, Markdown, Drive, a database, or another readable/writable system.

The version layer can be GitHub, GitLab, local Git, snapshots, or another auditable history system.

The agent can be ChatGPT, Claude, Codex, Cursor, a local agent, or a custom agent.

Beaver Relay helps an agent:

- restore the current project state;
- remember where work was interrupted;
- identify verified facts, blockers, decisions, and the next action;
- surface one concrete next physical action so re-entry is fast;
- park side ideas without letting them replace the current task;
- continue work without asking the user to repeat context;
- write meaningful changes back to the persistent workspace;
- preserve an auditable history and rollback path when available;
- hand the project to a different agent without starting from zero.

## Core promise

> Never start from zero.

A fresh agent with no prior chat context should be able to read the workspace, understand where the work stands, see where the last session stopped, and continue with the correct next action.

## Install

Use `SKILL.md` in a compatible agent/skill environment.

## Why "Beaver Relay"?

A beaver does not just carry information. It continuously builds, repairs, and maintains a durable environment.

Beaver Relay does the same for interrupted AI work: it keeps the structure intact, marks where the work stopped, and leaves the next step ready.

The agent may change. The structure remains.

## License

MIT
