import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const port = Number(process.env.PORT ?? 8787);
const CONTROL_TOKEN = process.env.CONTROL_TOKEN ?? "";
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? "";
const BOOTSTRAP_TOKEN = process.env.BOOTSTRAP_TOKEN ?? "";

if (!CONTROL_TOKEN || !AGENT_TOKEN || !BOOTSTRAP_TOKEN) {
  console.error("CONTROL_TOKEN, AGENT_TOKEN and BOOTSTRAP_TOKEN are required");
  process.exit(1);
}

const tasks = new Map();
const queue = [];
const MAX_TASKS = 200;

function now() { return new Date().toISOString(); }
function safeTask(task) {
  if (!task) return null;
  return {
    id: task.id,
    project: task.project,
    mode: task.mode,
    status: task.status,
    instruction: task.instruction,
    createdAt: task.createdAt,
    claimedAt: task.claimedAt ?? null,
    completedAt: task.completedAt ?? null,
    exitCode: task.exitCode ?? null,
    result: task.result ?? null,
    evidence: task.evidence ?? null,
    error: task.error ?? null,
  };
}
function prune() {
  if (tasks.size <= MAX_TASKS) return;
  const done = [...tasks.values()]
    .filter(t => ["completed","failed","cancelled"].includes(t.status))
    .sort((a,b) => a.createdAt.localeCompare(b.createdAt));
  for (const task of done) {
    if (tasks.size <= MAX_TASKS) break;
    tasks.delete(task.id);
  }
}
function authFromUrl(url, expected) {
  return url.searchParams.get("key") === expected ||
    url.searchParams.get("token") === expected;
}
async function readJson(req, limit = 1_000_000) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw new Error("body_too_large");
  }
  return body ? JSON.parse(body) : {};
}
function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function createMcpServer() {
  const server = new McpServer(
    { name: "beaver-local-agent", version: "0.1.0" },
    { instructions: "Use submit_task to hand approved local Bunana work to the isolated ai-agent. Use get_task to check completion. Do not claim success until the task reports completed and evidence is returned." }
  );

  server.registerTool(
    "submit_task",
    {
      title: "Submit local AI task",
      description: "Queue a task for the user's isolated Windows ai-agent. Use project=bunana for Bunana work. Write mode allows edits inside the mapped AI workspace; read_only mode only inspects.",
      inputSchema: {
        project: z.enum(["bunana"]).default("bunana"),
        mode: z.enum(["read_only","write"]).default("write"),
        instruction: z.string().min(1).max(30000)
      },
      outputSchema: {
        id: z.string(),
        status: z.string(),
        project: z.string(),
        mode: z.string()
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: false
      }
    },
    async ({ project, mode, instruction }) => {
      const id = randomUUID();
      const task = { id, project, mode, instruction, status: "queued", createdAt: now() };
      tasks.set(id, task);
      queue.push(id);
      prune();
      return {
        structuredContent: { id, status: task.status, project, mode },
        content: [{ type: "text", text: `Queued local task ${id} for ${project} (${mode}).` }]
      };
    }
  );

  server.registerTool(
    "get_task",
    {
      title: "Get local task status",
      description: "Read the current status, final result, and evidence for a previously submitted local ai-agent task.",
      inputSchema: { id: z.string().min(1) },
      outputSchema: {
        task: z.object({
          id: z.string(),
          project: z.string(),
          mode: z.string(),
          status: z.string(),
          instruction: z.string(),
          createdAt: z.string(),
          claimedAt: z.string().nullable(),
          completedAt: z.string().nullable(),
          exitCode: z.number().nullable(),
          result: z.string().nullable(),
          evidence: z.string().nullable(),
          error: z.string().nullable()
        }).nullable()
      },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false }
    },
    async ({ id }) => {
      const task = safeTask(tasks.get(id));
      return {
        structuredContent: { task },
        content: [{ type: "text", text: task ? JSON.stringify(task) : `Task ${id} not found.` }]
      };
    }
  );

  server.registerTool(
    "list_recent_tasks",
    {
      title: "List recent local tasks",
      description: "List recent tasks queued for the isolated local ai-agent.",
      inputSchema: { limit: z.number().int().min(1).max(20).default(10) },
      outputSchema: {
        tasks: z.array(z.object({
          id: z.string(), project: z.string(), mode: z.string(), status: z.string(), createdAt: z.string()
        }))
      },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false }
    },
    async ({ limit }) => {
      const recent = [...tasks.values()]
        .sort((a,b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(t => ({ id:t.id, project:t.project, mode:t.mode, status:t.status, createdAt:t.createdAt }));
      return {
        structuredContent: { tasks: recent },
        content: [{ type: "text", text: JSON.stringify(recent) }]
      };
    }
  );

  server.registerTool(
    "cancel_task",
    {
      title: "Cancel queued local task",
      description: "Cancel a task only if it has not been claimed by the local ai-agent yet.",
      inputSchema: { id: z.string().min(1) },
      outputSchema: { id: z.string(), status: z.string() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true }
    },
    async ({ id }) => {
      const task = tasks.get(id);
      if (!task) {
        return { structuredContent:{id,status:"not_found"}, content:[{type:"text",text:"Task not found."}] };
      }
      if (task.status !== "queued") {
        return { structuredContent:{id,status:task.status}, content:[{type:"text",text:`Task is already ${task.status}.`}] };
      }
      task.status = "cancelled";
      task.completedAt = now();
      return { structuredContent:{id,status:"cancelled"}, content:[{type:"text",text:"Cancelled."}] };
    }
  );

  return server;
}

const httpServer = createServer(async (req, res) => {
  if (!req.url) return res.writeHead(400).end("Missing URL");
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    return json(res, 200, { ok:true, service:"beaver-local-agent-relay", queued:queue.length, tasks:tasks.size });
  }

  if (req.method === "GET" && url.pathname === "/bootstrap") {
    if (!authFromUrl(url, BOOTSTRAP_TOKEN)) return json(res, 401, { error:"unauthorized" });
    const tokenLiteral = AGENT_TOKEN.replace(/'/g, "''");
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$BridgeDir = 'D:\\AI_WORKSPACE\\bridge'",
      "$Worker = Join-Path $BridgeDir 'worker.ps1'",
      "$TokenPath = Join-Path $BridgeDir 'agent-token.txt'",
      "$StartCodex = 'D:\\AI_WORKSPACE\\Start-Codex.ps1'",
      "New-Item -ItemType Directory -Force -Path $BridgeDir | Out-Null",
      "'" + tokenLiteral + "' | Set-Content -LiteralPath $TokenPath -NoNewline -Encoding ASCII",
      "Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/galwaysd/beaver-relay/ai-agent-bridge/bridge/worker/worker.ps1' -OutFile $Worker",
      "if (Test-Path -LiteralPath $StartCodex) {",
      "  $text = Get-Content -Raw -LiteralPath $StartCodex",
      "  if ($text -notmatch 'BEGIN BUNANA AI BRIDGE') {",
      "    $block = @'",
      "# BEGIN BUNANA AI BRIDGE",
      "$__bunanaBridge = 'D:\\AI_WORKSPACE\\bridge\\worker.ps1'",
      "if (Test-Path -LiteralPath $__bunanaBridge) {",
      "  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$__bunanaBridge)",
      "}",
      "# END BUNANA AI BRIDGE",
      "",
      "'@",
      "    Set-Content -LiteralPath $StartCodex -Value ($block + $text) -Encoding UTF8",
      "  }",
      "}",
      "Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Worker)",
      "Write-Host 'BUNANA_AI_BRIDGE=PASS'",
      "Write-Host 'Project: D:\\AI_WORKSPACE\\agent-workspace\\bunana-v2'"
    ].join("\r\n");
    res.writeHead(200, { "content-type":"text/plain; charset=utf-8", "cache-control":"no-store" });
    return res.end(script);
  }

  if (req.method === "GET" && url.pathname === "/agent/next") {
    if (!authFromUrl(url, AGENT_TOKEN)) return json(res, 401, { error:"unauthorized" });
    let task = null;
    while (queue.length && !task) {
      const id = queue.shift();
      const candidate = tasks.get(id);
      if (candidate?.status === "queued") {
        candidate.status = "running";
        candidate.claimedAt = now();
        task = candidate;
      }
    }
    return json(res, 200, { task: task ? { id:task.id, project:task.project, mode:task.mode, instruction:task.instruction } : null });
  }

  if (req.method === "POST" && url.pathname === "/agent/result") {
    if (!authFromUrl(url, AGENT_TOKEN)) return json(res, 401, { error:"unauthorized" });
    try {
      const body = await readJson(req);
      const task = tasks.get(String(body.id ?? ""));
      if (!task) return json(res, 404, { error:"task_not_found" });
      task.status = Number(body.exitCode) === 0 ? "completed" : "failed";
      task.completedAt = now();
      task.exitCode = Number.isFinite(Number(body.exitCode)) ? Number(body.exitCode) : 1;
      task.result = String(body.result ?? "").slice(0, 200000);
      task.evidence = String(body.evidence ?? "").slice(0, 100000);
      task.error = String(body.error ?? "").slice(0, 50000) || null;
      return json(res, 200, { ok:true, id:task.id, status:task.status });
    } catch (error) {
      return json(res, 400, { error:String(error?.message ?? error) });
    }
  }

  if (req.method === "OPTIONS" && url.pathname === "/mcp") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods":"POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":"content-type, mcp-session-id",
      "Access-Control-Expose-Headers":"Mcp-Session-Id"
    });
    return res.end();
  }

  if (url.pathname === "/mcp" && ["POST","GET","DELETE"].includes(req.method ?? "")) {
    if (!authFromUrl(url, CONTROL_TOKEN)) return json(res, 401, { error:"unauthorized" });
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Expose-Headers","Mcp-Session-Id");
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP error", error);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`beaver-local-agent-relay listening on :${port}`);
});
