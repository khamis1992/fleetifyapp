# Simple test for traffic fine webhook

Write-Host "Testing webhook with your company ID..." -ForegroundColor Green

$webhookUrl = "https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine"
$webhookSecret = $env:ZAPIER_WEBHOOK_SECRET
$anonKey = $env:SUPABASE_ANON_KEY
if ([string]::IsNullOrWhiteSpace($webhookSecret) -or [string]::IsNullOrWhiteSpace($anonKey)) {
    throw "ZAPIER_WEBHOOK_SECRET and SUPABASE_ANON_KEY are required"
}

$testPayload = @{
    company_id = "6dfd73fd-221b-4d93-aa98-41f80ce58db2"
    vehicle_plate = "TEST-123"
    violation_date = "2025-01-10"
    amount = 150.00
    violation_type = "Speeding"
    location = "Highway 101"
    reason = "Exceeded speed limit"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $anonKey"
    "x-webhook-secret" = $webhookSecret
}

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $testPayload -Headers $headers
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Yellow
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Yellow
    }
}
