# Simple test for traffic fine webhook

Write-Host "Testing webhook with your company ID..." -ForegroundColor Green

$webhookUrl = "https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine"
$webhookSecret = "fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs"

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