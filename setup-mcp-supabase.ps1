# Qoder MCP Supabase Configuration Setup Script
Write-Host "Setting up Qoder MCP Supabase Configuration..." -ForegroundColor Cyan

$mcpConfig = @{
    mcpServers = @{
        supabase = @{
            command = "npx"
            args = @("-y", "@supabase/mcp-server-supabase")
            env = @{
                SUPABASE_PROJECT_REF = "qwhunliohlkkahbspfiu"
                SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQxMzA4NiwiZXhwIjoyMDY4OTg5MDg2fQ.vw3DWeoAyLSe_0MLQPFgSu-TL28W8mbTx7tEfhKe6Zg"
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
