# Qoder MCP Supabase Configuration Setup Script
Write-Host "Setting up Qoder MCP Supabase Configuration..." -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($env:SUPABASE_SERVICE_ROLE_KEY)) {
    throw "SUPABASE_SERVICE_ROLE_KEY is required"
}

$mcpConfig = @{
    mcpServers = @{
        supabase = @{
            command = "npx"
            args = @("-y", "@supabase/mcp-server-supabase")
            env = @{
                SUPABASE_PROJECT_REF = "qwhunliohlkkahbspfiu"
                SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
                SUPABASE_URL = "https://qwhunliohlkkahbspfiu.supabase.co"
            }
        }
    }
}

$qoderConfigDir = "$env:APPDATA\Qoder"
$configPath = "$qoderConfigDir\mcp-settings.json"

if (-not (Test-Path $qoderConfigDir)) {
    New-Item -ItemType Directory -Path $qoderConfigDir -Force | Out-Null
}

$jsonConfig = $mcpConfig | ConvertTo-Json -Depth 10
Set-Content -Path $configPath -Value $jsonConfig -Encoding UTF8

Write-Host "Config created at: $configPath" -ForegroundColor Green
Write-Host "Please restart Qoder IDE completely" -ForegroundColor Yellow
