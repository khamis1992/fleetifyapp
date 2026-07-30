[CmdletBinding()]
param(
  [string]$Username
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$dataDir = Join-Path $repoRoot '.taqadi-agent'
$credentialPath = Join-Path $dataDir 'tawtheeq-credential.clixml'

if (-not $Username) {
  $Username = Read-Host 'Tawtheeq username'
}
if (-not $Username) {
  throw 'Tawtheeq username is required.'
}

$password = Read-Host 'Tawtheeq password' -AsSecureString
if (-not $password) {
  throw 'Tawtheeq password is required.'
}

New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
$credential = [System.Management.Automation.PSCredential]::new(
  $Username,
  $password
)
$credential | Export-Clixml -LiteralPath $credentialPath -Force

[pscustomobject]@{
  Saved = $true
  Username = $Username
  Path = $credentialPath
  Protection = 'Windows DPAPI - current user and computer'
  RestartRequired = $true
}
