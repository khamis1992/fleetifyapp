# Test Webhook Endpoint
$url = "https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine"
$secret = "fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1"

# Test 1: Simple ping test
Write-Host "=== Test 1: Ping Test ===" -ForegroundColor Cyan
$headers = @{
    "Content-Type" = "application/json"
    "x-webhook-secret" = $secret
}

$body = @{
    test = "ping"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 2: Valid traffic fine data (requires company_id)
Write-Host "=== Test 2: Valid Traffic Fine (Need Company ID) ===" -ForegroundColor Cyan
Write-Host "To run this test, get your company_id from Supabase:" -ForegroundColor Yellow
Write-Host "SELECT id FROM companies;" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then update the test-webhook.ps1 file with your company_id" -ForegroundColor Yellow

# Uncomment and add your company_id to test
<#
$testFineData = @{
    company_id = "YOUR_COMPANY_ID_HERE"
    penalty_number = "TEST123"
    violation_date = "2025-10-12"
    violation_type = "Speeding"
    vehicle_plate = "ABC-1234"
    location = "Kuwait City"
    amount = 50.0
    reason = "Exceeding speed limit"
    email_subject = "Test Traffic Fine"
    email_body = "This is a test"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $testFineData -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
#>
