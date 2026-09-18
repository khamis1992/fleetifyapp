[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$dataDir = Join-Path $repoRoot '.taqadi-agent'
$credentialPath = Join-Path $dataDir 'smart-card-pin.clixml'

$pin = Read-Host 'Tawtheeq smart card PIN' -AsSecureString
if (-not $pin) { throw 'The Tawtheeq smart card PIN is required.' }

New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
$credential = [System.Management.Automation.PSCredential]::new(
  'TaqadiSmartCard',
  $pin
)
$credential | Export-Clixml -LiteralPath $credentialPath -Force

[pscustomobject]@{
  Saved = $true
  Path = $credentialPath
  Protection = 'Windows DPAPI - current user and computer'
  RestartRequired = $true
}
