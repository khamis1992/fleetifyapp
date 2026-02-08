# Apply Migration via Supabase SQL Editor
# This script reads the migration file and provides instructions

$migrationFile = "supabase\migrations\20260208000001_fix_invoice_date_before_contract_start.sql"
$projectUrl = "https://qwhunliohlkkahbspfiu.supabase.co"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Supabase Migration Application Guide" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "📁 Migration file: $migrationFile`n" -ForegroundColor Yellow

# Check if file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found!" -ForegroundColor Red
    exit 1
}

# Read migration content
$migrationSQL = Get-Content $migrationFile -Raw
$lineCount = ($migrationSQL -split "`n").Count

Write-Host "📝 Migration details:" -ForegroundColor Green
Write-Host "   - Lines: $lineCount" -ForegroundColor White
Write-Host "   - Size: $($migrationSQL.Length) characters`n" -ForegroundColor White

Write-Host "🔧 How to apply this migration:`n" -ForegroundColor Cyan

Write-Host "Option 1: Using Supabase Dashboard (Recommended)" -ForegroundColor Yellow
Write-Host "   1. Open: $projectUrl/project/qwhunliohlkkahbspfiu/sql/new" -ForegroundColor White
Write-Host "   2. Copy the SQL from: $migrationFile" -ForegroundColor White
Write-Host "   3. Paste it in the SQL Editor" -ForegroundColor White
Write-Host "   4. Click 'Run' button`n" -ForegroundColor White

Write-Host "Option 2: Copy SQL to Clipboard" -ForegroundColor Yellow
Write-Host "   Press 'C' to copy the SQL to clipboard" -ForegroundColor White
Write-Host "   Then paste it in Supabase SQL Editor`n" -ForegroundColor White

Write-Host "Option 3: View SQL Content" -ForegroundColor Yellow
Write-Host "   Press 'V' to view the SQL content`n" -ForegroundColor White

Write-Host "Press any other key to exit`n" -ForegroundColor Gray

$key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

if ($key.Character -eq 'c' -or $key.Character -eq 'C') {
    Write-Host "`n📋 Copying SQL to clipboard..." -ForegroundColor Yellow
    Set-Clipboard -Value $migrationSQL
    Write-Host "✅ SQL copied to clipboard!" -ForegroundColor Green
    Write-Host "`nNow:" -ForegroundColor Cyan
    Write-Host "1. Open Supabase SQL Editor: $projectUrl/project/qwhunliohlkkahbspfiu/sql/new" -ForegroundColor White
    Write-Host "2. Paste (Ctrl+V) and Run`n" -ForegroundColor White
    Start-Process "$projectUrl/project/qwhunliohlkkahbspfiu/sql/new"
}
elseif ($key.Character -eq 'v' -or $key.Character -eq 'V') {
    Write-Host "`n📄 Migration SQL Content:" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host $migrationSQL -ForegroundColor White
    Write-Host "─────────────────────────────────────────────────────────`n" -ForegroundColor Gray
}
else {
    Write-Host "`n👋 Exiting..." -ForegroundColor Gray
}

Write-Host "`n✅ Done!`n" -ForegroundColor Green
