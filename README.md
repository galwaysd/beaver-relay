# Beaver Relay

**Your agent can leave. The work stays.**

Beaver Relay is a platform-agnostic skill for persistent AI work across sessions, models, and tools.

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
- identify verified facts, blockers, decisions, and the next action;
- continue work without asking the user to repeat context;
- write meaningful changes back to the persistent workspace;
- preserve an auditable history and rollback path when available;
- hand the project to a different agent without starting from zero.

## Core promise

> Never start from zero.

A fresh agent with no prior chat context should be able to read the workspace, understand where the work stands, and continue with the correct next action.

## Install

Use `SKILL.md` in a compatible agent/skill environment.

## Why "Beaver Relay"?

A beaver does not just carry information. It continuously builds, repairs, and maintains a durable environment.

The agent may change. The structure remains.

## License

MIT
