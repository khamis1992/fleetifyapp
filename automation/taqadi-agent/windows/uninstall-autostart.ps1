[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$taskName = 'Fleetify Taqadi Agent'
$healthUrl = 'http://127.0.0.1:4317/health'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($task) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Start-Sleep -Seconds 2
$agentStillRunning = $false
try {
  $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
  $agentStillRunning = $health.status -eq 'ok'
} catch {
  $agentStillRunning = $false
}

[pscustomobject]@{
  Removed = [bool]$task
  TaskName = $taskName
  AgentStillRunning = $agentStillRunning
}
