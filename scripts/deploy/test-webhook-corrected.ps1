# Test Webhook Endpoint with Correct Anon Key
$url = "https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine"
$secret = "fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs"

Write-Host "=== Testing Webhook with Correct Keys ===" -ForegroundColor Cyan
Write-Host "URL: $url" -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
    "x-webhook-secret" = $secret
}

$body = @{
    test = "validation-check"
} | ConvertTo-Json

Write-Host "Sending test request..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Webhook is working! (Got expected validation error)" -ForegroundColor Yellow
        Write-Host "Status Code: 400 Bad Request" -ForegroundColor Yellow
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "This is CORRECT behavior - the webhook is accessible and validating input!" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Get your company_id: Run 'SELECT id FROM companies;' in Supabase" -ForegroundColor White
Write-Host "2. Add these exact headers to Zapier:" -ForegroundColor White
Write-Host "   - Content-Type: application/json" -ForegroundColor Gray
Write-Host "   - apikey: $anonKey" -ForegroundColor Gray
Write-Host "   - Authorization: Bearer $anonKey" -ForegroundColor Gray
Write-Host "   - x-webhook-secret: $secret" -ForegroundColor Gray
Write-Host ""
Write-Host "3. See ZAPIER_CORRECT_CONFIGURATION.md for complete setup guide" -ForegroundColor White
