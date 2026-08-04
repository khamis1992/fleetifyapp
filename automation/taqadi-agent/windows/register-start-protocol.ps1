[CmdletBinding()]
param(
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$scheme = 'fleetify-taqadi'
$classesRoot = "HKCU:\Software\Classes\$scheme"
$runnerScript = Join-Path $PSScriptRoot 'start-agent.ps1'

if ($Uninstall) {
  Remove-Item -LiteralPath $classesRoot -Recurse -Force -ErrorAction SilentlyContinue
  [pscustomobject]@{
    Registered = $false
    Scheme = $scheme
  }
  return
}

if (-not (Test-Path -LiteralPath $runnerScript)) {
  throw "Start script not found: $runnerScript"
}

$powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
$command = (
  '"{0}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{1}" "%1"' `
    -f $powershellPath, $runnerScript
)

New-Item -Path $classesRoot -Force | Out-Null
Set-ItemProperty -LiteralPath $classesRoot -Name '(Default)' -Value 'URL:Fleetify Taqadi Agent'
New-ItemProperty -LiteralPath $classesRoot -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null

$commandKey = Join-Path $classesRoot 'shell\open\command'
New-Item -Path $commandKey -Force | Out-Null
Set-ItemProperty -LiteralPath $commandKey -Name '(Default)' -Value $command

[pscustomobject]@{
  Registered = $true
  Scheme = $scheme
  LaunchUrl = "$scheme`://start"
  Command = $command
  Note = 'The ERP start button now works from this computer browser. No admin rights were required.'
}
