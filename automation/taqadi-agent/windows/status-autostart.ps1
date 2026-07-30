[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$taskName = 'Fleetify Taqadi Agent'
$healthUrl = 'http://127.0.0.1:4317/health'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$taskInfo = if ($task) {
  Get-ScheduledTaskInfo -TaskName $taskName
} else {
  $null
}
$health = $null

try {
  $candidate = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
  if ($candidate.status -eq 'ok') {
    $health = $candidate
  }
} catch {
  $health = $null
}

[pscustomobject]@{
  Installed = [bool]$task
  TaskName = $taskName
  TaskState = if ($task) { $task.State } else { 'NotInstalled' }
  LastRunTime = if ($taskInfo) { $taskInfo.LastRunTime } else { $null }
  LastTaskResult = if ($taskInfo) { $taskInfo.LastTaskResult } else { $null }
  AgentConnected = [bool]$health
  WorkerId = if ($health) { $health.workerId } else { $null }
  AgentStatus = if ($health) { $health.runtime.status } else { 'offline' }
  CurrentJobId = if ($health) { $health.runtime.currentJobId } else { $null }
  ProcessId = if ($health) { $health.process.pid } else { $null }
  StartedAt = if ($health) { $health.runtime.startedAt } else { $null }
}
