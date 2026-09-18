[CmdletBinding()]
param([switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$orientationTaskName = 'Fleetify Daily Document Orientation'
if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $orientationTaskName -Confirm:$false -ErrorAction SilentlyContinue
  exit 0
}
$orientationRepo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$orientationRunner = Join-Path $PSScriptRoot 'run-daily.ps1'
$orientationPowerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$orientationUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$orientationZone = [System.TimeZoneInfo]::FindSystemTimeZoneById('Arab Standard Time')
$orientationQatarNow = [System.TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $orientationZone)
$orientationAtQatar = [DateTime]::SpecifyKind($orientationQatarNow.Date.AddHours(3), [DateTimeKind]::Unspecified)
$orientationAtLocal = [System.TimeZoneInfo]::ConvertTime($orientationAtQatar, $orientationZone, [System.TimeZoneInfo]::Local)
$orientationAction = New-ScheduledTaskAction -Execute $orientationPowerShell -WorkingDirectory $orientationRepo `
  -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $orientationRunner)
$orientationTrigger = New-ScheduledTaskTrigger -Daily -At $orientationAtLocal
$orientationPrincipal = New-ScheduledTaskPrincipal -UserId $orientationUser -LogonType Interactive -RunLevel Limited
$orientationSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName $orientationTaskName -Action $orientationAction -Trigger $orientationTrigger `
  -Principal $orientationPrincipal -Settings $orientationSettings `
  -Description 'Inspects new or changed contract PDF orientation daily at 03:00 Qatar time; preserves originals and human reviews.' -Force | Out-Null
Get-ScheduledTask -TaskName $orientationTaskName | Select-Object TaskName, State
Get-ScheduledTaskInfo -TaskName $orientationTaskName | Select-Object NextRunTime, LastTaskResult
