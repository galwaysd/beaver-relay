# AI Agent Bridge

A small authenticated relay that lets ChatGPT hand bounded work to a local, low-privilege Codex worker.

## Security model

- The relay never receives Windows credentials.
- ChatGPT uses a control token only for MCP task submission/status.
- The local worker uses a separate agent token for polling and result upload.
- The worker maps logical project names to fixed paths and never accepts an arbitrary remote filesystem path.
- The outer Windows `ai-agent` account remains the primary filesystem boundary.
- Push/deploy/admin actions remain outside the autonomous worker policy.

This branch is intentionally separate from Beaver Relay's protocol-only `main` branch.
