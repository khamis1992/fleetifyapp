[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$orientationRepo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Set-Location -LiteralPath $orientationRepo
$orientationNode = (Get-Command node.exe -ErrorAction Stop).Source
$orientationCli = Join-Path $orientationRepo 'node_modules\tsx\dist\cli.mjs'
$orientationLogDir = Join-Path $orientationRepo '.document-orientation-agent'
New-Item -ItemType Directory -Path $orientationLogDir -Force | Out-Null
$orientationIndex = Join-Path $orientationRepo 'automation\document-orientation-agent\index.ts'
$orientationArguments = '"{0}" "{1}" --apply' -f $orientationCli, $orientationIndex
$orientationProcess = Start-Process -FilePath $orientationNode -ArgumentList $orientationArguments `
  -WorkingDirectory $orientationRepo -WindowStyle Hidden -Wait -PassThru `
  -RedirectStandardOutput (Join-Path $orientationLogDir 'daily.stdout.log') `
  -RedirectStandardError (Join-Path $orientationLogDir 'daily.stderr.log')
exit $orientationProcess.ExitCode
