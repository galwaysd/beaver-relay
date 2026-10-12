$ErrorActionPreference = 'Stop'
$RelayBase = 'https://beaver-local-agent-relay.onrender.com'
$TokenPath = 'D:\AI_WORKSPACE\bridge\agent-token.txt'
$Workspace = 'D:\AI_WORKSPACE\agent-workspace\bunana-v2'
$Codex = 'D:\AI_WORKSPACE\tools\node_modules\.bin\codex.cmd'
$LogDir = 'D:\AI_WORKSPACE\bridge\logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$env:HTTP_PROXY='http://127.0.0.1:7890'
$env:HTTPS_PROXY='http://127.0.0.1:7890'
$env:ALL_PROXY='http://127.0.0.1:7890'

if (-not (Test-Path -LiteralPath $TokenPath)) { exit 2 }
$AgentToken = (Get-Content -Raw -LiteralPath $TokenPath).Trim()
$mutex = New-Object System.Threading.Mutex($false, 'Local\BunanaAIAgentBridgeV1')
if (-not $mutex.WaitOne(0)) { exit 0 }

function Post-Result($id,$exitCode,$result,$evidence,$err='') {
  $body = @{id=$id;exitCode=$exitCode;result=$result;evidence=$evidence;error=$err} | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Method Post -Uri ($RelayBase + '/agent/result?key=' + [uri]::EscapeDataString($AgentToken)) -ContentType 'application/json' -Body $body | Out-Null
}

try {
  while ($true) {
    try {
      $next = Invoke-RestMethod -Method Get -Uri ($RelayBase + '/agent/next?key=' + [uri]::EscapeDataString($AgentToken))
      if ($null -eq $next.task) { Start-Sleep -Seconds 3; continue }
      $task = $next.task
      if ($task.project -ne 'bunana') { Post-Result $task.id 3 '' '' 'Unsupported project'; continue }
      if (-not (Test-Path -LiteralPath $Workspace)) { Post-Result $task.id 2 '' '' ('Workspace not found: ' + $Workspace); continue }
      if (-not (Test-Path -LiteralPath $Codex)) { Post-Result $task.id 2 '' '' ('Codex not found: ' + $Codex); continue }

      $promptFile = Join-Path $LogDir ('task-' + $task.id + '.prompt.txt')
      $answerFile = Join-Path $LogDir ('task-' + $task.id + '.answer.txt')
      $stderrFile = Join-Path $LogDir ('task-' + $task.id + '.stderr.txt')

      $policy = @'
You are operating the user's Bunana project under a low-privilege Windows account.
Hard boundaries:
- Work only inside D:\AI_WORKSPACE\agent-workspace\bunana-v2.
- Never git push, create/merge PRs, deploy, modify CloudBase, modify C2C, change Windows settings/ACL/registry/services/scheduled tasks, or seek elevation.
- Preserve all pre-existing uncommitted changes. Never reset, stash, clean, checkout away, or discard user work.
- In read_only mode, do not edit project files.
- In write mode, make only the minimum changes required.
- Validate relevant changes. Prefer tsc --noEmit and git diff --check when applicable.
- Return concise files changed, validation, blockers, and any manual visual checks still needed.
'@
      ($policy + "`r`nTASK MODE: " + [string]$task.mode + "`r`nTASK:`r`n" + [string]$task.instruction) | Set-Content -LiteralPath $promptFile -Encoding UTF8

      Push-Location $Workspace
      try {
        if ($task.mode -eq 'read_only') {
          $args = @('exec','--sandbox','read-only','--ask-for-approval','never','--output-last-message',$answerFile,'-')
        } else {
          $args = @('exec','--full-auto','--output-last-message',$answerFile,'-')
        }
        Get-Content -Raw -LiteralPath $promptFile | & $Codex @args 2> $stderrFile
        $code = $LASTEXITCODE
      } finally { Pop-Location }

      $answer = if (Test-Path $answerFile) { Get-Content -Raw -LiteralPath $answerFile } else { '' }
      $stderr = if (Test-Path $stderrFile) { Get-Content -Raw -LiteralPath $stderrFile } else { '' }

      Push-Location $Workspace
      try {
        $status = (& git status --short --untracked-files=all 2>&1 | Out-String)
        $diffstat = (& git diff --stat 2>&1 | Out-String)
        $diffcheck = (& git diff --check 2>&1 | Out-String)
        $evidence = "git status:`r`n$status`r`ngit diff --stat:`r`n$diffstat`r`ngit diff --check:`r`n$diffcheck"
      } finally { Pop-Location }

      Post-Result $task.id $code $answer $evidence $stderr
    } catch {
      Add-Content -LiteralPath (Join-Path $LogDir 'worker-errors.log') -Value ('[' + (Get-Date -Format o) + '] ' + $_.Exception.Message)
      Start-Sleep -Seconds 5
    }
  }
} finally {
  try { $mutex.ReleaseMutex() } catch {}
  $mutex.Dispose()
}