[CmdletBinding()]
param(
  [switch]$Uninstall,
  [ValidateRange(1, 60)]
  [int]$IntervalMinutes = 5
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$watchdogTaskName = 'Fleetify Taqadi Agent Watchdog'
$startScript = Join-Path $PSScriptRoot 'start-agent.ps1'
$powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $watchdogTaskName -Confirm:$false -ErrorAction SilentlyContinue
  [pscustomobject]@{ Installed = $false; TaskName = $watchdogTaskName }
  return
}

if (-not (Test-Path -LiteralPath $startScript)) {
  throw "Start script not found: $startScript"
}

# The watchdog runs start-agent.ps1 every few minutes. start-agent.ps1 exits
# immediately when the agent health endpoint answers, and only starts the main
# task when the agent is actually down — so this self-heals logon kills and
# unexpected session ends without any manual action.
$actionArguments = (
  '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden ' +
  '-File "{0}"' -f $startScript
)
$action = New-ScheduledTaskAction `
  -Execute $powershellPath `
  -Argument $actionArguments

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$repeatTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$trigger.Repetition = $repeatTrigger.Repetition

$principal = New-ScheduledTaskPrincipal `
  -UserId $userId `
  -LogonType Interactive `
  -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $watchdogTaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description 'Keeps the Fleetify Taqadi agent alive: starts it whenever the health endpoint is down.' `
  -Force | Out-Null

Start-ScheduledTask -TaskName $watchdogTaskName

[pscustomobject]@{
  Installed = $true
  TaskName = $watchdogTaskName
  IntervalMinutes = $IntervalMinutes
  User = $userId
  Script = $startScript
}
