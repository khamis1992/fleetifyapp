[CmdletBinding()]
param(
  [string]$Uri = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$taskName = 'Fleetify Taqadi Agent'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$runnerScript = Join-Path $PSScriptRoot 'run-agent.ps1'
$logDir = Join-Path $repoRoot '.taqadi-agent\logs'
$supervisorLog = Join-Path $logDir 'autostart-supervisor.log'
$healthUrl = 'http://127.0.0.1:4317/health'

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Write-LauncherLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  $line = '{0} [launcher] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -LiteralPath $supervisorLog -Value $line -Encoding UTF8
}

try {
  $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
  if ($health.status -eq 'ok') {
    Write-LauncherLog 'Start requested but the agent is already healthy.'
    exit 0
  }
} catch {
  # Agent is offline; continue with the start request.
}

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
  $source = if ($Uri -ne '') { $Uri } else { 'manual' }
  try {
    if ($task.State -eq 'Disabled') {
      Write-LauncherLog ('Start requested ({0}); enabling the disabled scheduled task.' -f $source)
      Enable-ScheduledTask -TaskName $taskName | Out-Null
    }

    Write-LauncherLog ('Start requested ({0}); starting scheduled task.' -f $source)
    Start-ScheduledTask -TaskName $taskName
    exit 0
  } catch {
    Write-LauncherLog (
      'Scheduled task could not be started; falling back to the direct supervisor: {0}' `
        -f $_.Exception.Message
    )
  }
}

if (Test-Path -LiteralPath $runnerScript) {
  Write-LauncherLog 'Scheduled task is missing; starting the supervisor script directly.'
  $powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
  Start-Process `
    -FilePath $powershellPath `
    -ArgumentList ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $runnerScript) `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden
  exit 0
}

Write-LauncherLog "Unable to start the agent: runner script not found at $runnerScript"
exit 1
