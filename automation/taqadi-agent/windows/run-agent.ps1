[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$dataDir = Join-Path $repoRoot '.taqadi-agent'
$logDir = Join-Path $dataDir 'logs'
$supervisorLog = Join-Path $logDir 'autostart-supervisor.log'
$agentPidPath = Join-Path $dataDir 'autostart-agent.pid'
$tawtheeqCredentialPath = Join-Path $dataDir 'tawtheeq-credential.clixml'
$healthUrl = 'http://127.0.0.1:4317/health'

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Write-SupervisorLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -LiteralPath $supervisorLog -Value $line -Encoding UTF8
}

function Get-AgentHealth {
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
    if ($health.status -eq 'ok') {
      return $health
    }
  } catch {
    return $null
  }

  return $null
}

$createdNew = $false
$mutex = [System.Threading.Mutex]::new(
  $true,
  'Local\FleetifyTaqadiAgentSupervisor',
  [ref]$createdNew
)

if (-not $createdNew) {
  Write-SupervisorLog 'Another autostart supervisor is already running.'
  $mutex.Dispose()
  exit 0
}

try {
  Get-ChildItem -LiteralPath $logDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  Set-Location -LiteralPath $repoRoot

  while ($true) {
    if (Get-AgentHealth) {
      Start-Sleep -Seconds 10
      continue
    }

    $envPath = Join-Path $repoRoot '.env.taqadi-agent'
    $tsxCli = Join-Path $repoRoot 'node_modules\tsx\dist\cli.mjs'
    $agentEntry = Join-Path $repoRoot 'automation\taqadi-agent\index.ts'
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue

    if (-not (Test-Path -LiteralPath $envPath)) {
      Write-SupervisorLog 'Missing .env.taqadi-agent; retrying in 60 seconds.'
      Start-Sleep -Seconds 60
      continue
    }
    if (-not $nodeCommand) {
      Write-SupervisorLog 'node.exe is unavailable; retrying in 60 seconds.'
      Start-Sleep -Seconds 60
      continue
    }
    if (-not (Test-Path -LiteralPath $tsxCli)) {
      Write-SupervisorLog 'tsx is unavailable; run npm install. Retrying in 60 seconds.'
      Start-Sleep -Seconds 60
      continue
    }

    Remove-Item Env:TAQADI_TAWTHEEQ_USERNAME -ErrorAction SilentlyContinue
    Remove-Item Env:TAQADI_TAWTHEEQ_PASSWORD -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $tawtheeqCredentialPath) {
      try {
        $tawtheeqCredential = Import-Clixml -LiteralPath $tawtheeqCredentialPath
        if (
          -not $tawtheeqCredential.UserName -or
          -not $tawtheeqCredential.Password
        ) {
          throw 'The encrypted Tawtheeq credential is incomplete.'
        }
        $env:TAQADI_TAWTHEEQ_USERNAME = $tawtheeqCredential.UserName
        $env:TAQADI_TAWTHEEQ_PASSWORD = (
          $tawtheeqCredential.GetNetworkCredential().Password
        )
        Write-SupervisorLog 'Loaded the encrypted Tawtheeq credential.'
      } catch {
        Write-SupervisorLog (
          'Unable to load the encrypted Tawtheeq credential: {0}' `
            -f $_.Exception.Message
        )
      }
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $stdoutLog = Join-Path $logDir "agent-$stamp.out.log"
    $stderrLog = Join-Path $logDir "agent-$stamp.err.log"
    $arguments = @(
      ('"{0}"' -f $tsxCli),
      ('"{0}"' -f $agentEntry)
    )

    Write-SupervisorLog 'Starting the Taqadi agent.'
    try {
      $agent = Start-Process `
        -FilePath $nodeCommand.Source `
        -ArgumentList $arguments `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -WindowStyle Hidden `
        -PassThru

      Set-Content -LiteralPath $agentPidPath -Value $agent.Id -Encoding ASCII
      $agent.WaitForExit()
      Write-SupervisorLog (
        'The Taqadi agent exited with code {0}; restarting in 15 seconds.' `
          -f $agent.ExitCode
      )
    } catch {
      Write-SupervisorLog (
        'Unable to start the Taqadi agent: {0}' -f $_.Exception.Message
      )
    } finally {
      Remove-Item -LiteralPath $agentPidPath -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 15
  }
} finally {
  if ($createdNew) {
    $mutex.ReleaseMutex()
  }
  $mutex.Dispose()
}
