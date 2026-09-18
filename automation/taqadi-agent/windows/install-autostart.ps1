[CmdletBinding()]
param(
  [switch]$NoStart,
  [ValidateRange(10, 120)]
  [int]$HealthTimeoutSeconds = 45
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$taskName = 'Fleetify Taqadi Agent'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$runnerScript = Join-Path $PSScriptRoot 'agent-runner.ps1'
if (-not (Test-Path -LiteralPath $runnerScript)) {
  $runnerScript = Join-Path $PSScriptRoot 'run-agent.ps1'
}
$envPath = Join-Path $repoRoot '.env.taqadi-agent'
$tsxCli = Join-Path $repoRoot 'node_modules\tsx\dist\cli.mjs'
$healthUrl = 'http://127.0.0.1:4317/health'
$powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path -LiteralPath $runnerScript)) {
  throw "Agent runner not found: $runnerScript"
}
if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Create $envPath before installing autostart."
}
if (-not (Test-Path -LiteralPath $tsxCli)) {
  throw 'tsx is unavailable. Run npm install before installing autostart.'
}

$actionArguments = (
  '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden ' +
  '-File "{0}"' -f $runnerScript
)
$action = New-ScheduledTaskAction `
  -Execute $powershellPath `
  -Argument $actionArguments `
  -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$principal = New-ScheduledTaskPrincipal `
  -UserId $userId `
  -LogonType Interactive `
  -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -MultipleInstances IgnoreNew `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description 'Starts and supervises the Fleetify Taqadi browser agent after Windows logon.' `
  -Force | Out-Null

if (-not $NoStart) {
  Start-ScheduledTask -TaskName $taskName

  $deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
  $health = $null
  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
      if ($health.status -eq 'ok') {
        break
      }
    } catch {
      $health = $null
    }
    Start-Sleep -Seconds 2
  }

  if (-not $health -or $health.status -ne 'ok') {
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    throw (
      'Autostart was installed, but the agent did not become healthy. ' +
      "Task result: $($taskInfo.LastTaskResult)"
    )
  }
}

$task = Get-ScheduledTask -TaskName $taskName
$taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
[pscustomobject]@{
  Installed = $true
  TaskName = $taskName
  State = $task.State
  User = $userId
  Node = $nodePath
  Repository = $repoRoot
  LastRunTime = $taskInfo.LastRunTime
  LastTaskResult = $taskInfo.LastTaskResult
  AgentHealthy = [bool]($health -and $health.status -eq 'ok')
  WorkerId = if ($health) { $health.workerId } else { $null }
  ProcessId = if ($health) { $health.process.pid } else { $null }
}
