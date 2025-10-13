# Test Traffic Fine Webhook - Debug Version
# This script will help identify exactly which fields are causing validation errors

$webhookUrl = "https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine"
$webhookSecret = "fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs"

Write-Host "🧪 Testing Traffic Fine Webhook - Debug Mode" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Test 1: Complete valid payload
Write-Host "`n🧪 Test 1: Complete Valid Payload" -ForegroundColor Yellow
$completePayload = @{
    company_id = "6dfd73fd-221b-4d93-aa98-41f80ce58db2"
    vehicle_plate = "ABC-123" 
    violation_date = "2025-01-10"
    amount = 150.00
    violation_type = "Speeding"
    location = "Highway 101, Mile 25"
    reason = "Exceeded speed limit by 15 km/h"
    penalty_number = "TF-2025-001234"
    issuing_authority = "Traffic Police"
    due_date = "2025-02-10"
    email_subject = "Traffic Fine Notification"
    email_body = "You have received a traffic fine for speeding..."
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $anonKey"
    "x-webhook-secret" = $webhookSecret
}

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $completePayload -Headers $headers
    Write-Host "✅ SUCCESS: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Green
} catch {
    $errorDetails = $_.Exception.Response | ConvertFrom-Json 2>$null
    if ($errorDetails) {
        Write-Host "❌ VALIDATION ERROR: $($errorDetails.error)" -ForegroundColor Red
        Write-Host "📋 Details: $($errorDetails.details -join ', ')" -ForegroundColor Yellow
    } else {
        Write-Host "❌ HTTP ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: Missing penalty_number (should work - it's optional)
Write-Host "`n🧪 Test 2: Missing penalty_number (Should Work)" -ForegroundColor Yellow
$noPenaltyPayload = @{
    company_id = "6dfd73fd-221b-4d93-aa98-41f80ce58db2"
    vehicle_plate = "XYZ-789"
    violation_date = "2025-01-11"
    amount = 100.00
    violation_type = "Parking Violation"
    location = "Main Street"
    reason = "Parking in no parking zone"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $noPenaltyPayload -Headers $headers
    Write-Host "✅ SUCCESS (penalty auto-generated): $($response.penalty_number)" -ForegroundColor Green
} catch {
    $errorDetails = $_.Exception.Response | ConvertFrom-Json 2>$null
    if ($errorDetails) {
        Write-Host "❌ VALIDATION ERROR: $($errorDetails.error)" -ForegroundColor Red
        Write-Host "📋 Details: $($errorDetails.details -join ', ')" -ForegroundColor Yellow
    } else {
        Write-Host "❌ HTTP ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 3: Simulate typical Zapier extraction errors
Write-Host "`n🧪 Test 3: Common Zapier Issues" -ForegroundColor Yellow

$problematicPayloads = @(
    @{
        name = "Missing company_id"
        payload = @{
            vehicle_plate = "DEF-456"
            violation_date = "2025-01-12"
            amount = 200.00
            violation_type = "Red Light"
            location = "Main & 1st"
            reason = "Ran red light"
        }
    },
    @{
        name = "Empty vehicle_plate"
        payload = @{
            company_id = "6dfd73fd-221b-4d93-aa98-41f80ce58db2"
            vehicle_plate = ""
            violation_date = "2025-01-12"
            amount = 200.00
            violation_type = "Red Light"
            location = "Main & 1st"
            reason = "Ran red light"
        }
    },
    @{
        name = "Invalid date format"
        payload = @{
            company_id = "6dfd73fd-221b-4d93-aa98-41f80ce58db2"
            vehicle_plate = "GHI-789"
            violation_date = "Jan 12, 2025"
            amount = 200.00
            violation_type = "Red Light"
            location = "Main & 1st"
            reason = "Ran red light"
        }
    },
    @{
        name = "Amount as string with currency"
        payload = @{
            company_id = "6dfd73fd-221b-4d93-aa98-41f80ce58db2"
            vehicle_plate = "JKL-012"
            violation_date = "2025-01-12"
            amount = "$200.00"
            violation_type = "Red Light"
            location = "Main & 1st"
            reason = "Ran red light"
        }
    },
    @{
        name = "Missing required fields"
        payload = @{
            company_id = "6dfd73fd-221b-4d93-aa98-41f80ce58db2"
            vehicle_plate = "MNO-345"
            penalty_number = $null
        }
    }
)

foreach ($test in $problematicPayloads) {
    Write-Host "`n  🔍 Testing: $($test.name)" -ForegroundColor Magenta
    
    $jsonPayload = $test.payload | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $jsonPayload -Headers $headers
        Write-Host "    ❓ Unexpected success: $($response.message)" -ForegroundColor Yellow
    } catch {
        $errorDetails = $_.Exception.Response | ConvertFrom-Json 2>$null
        if ($errorDetails) {
            Write-Host "    ❌ Expected error: $($errorDetails.error)" -ForegroundColor Red
            if ($errorDetails.details) {
                Write-Host "    📋 Missing fields: $($errorDetails.details -join ', ')" -ForegroundColor Yellow
            }
        } else {
            Write-Host "    ❌ HTTP ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n🎯 Summary:" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
Write-Host "1. If Test 1 failed with 'company_id is required' -> Replace with your actual company ID" -ForegroundColor White
Write-Host "2. If Test 2 worked -> penalty_number is optional (auto-generated)" -ForegroundColor White  
Write-Host "3. Test 3 shows common validation errors from Zapier extractions" -ForegroundColor White
Write-Host "`n📋 Next Steps:" -ForegroundColor Green
Write-Host "- Get your company_id from Supabase: SELECT id, name FROM companies;" -ForegroundColor White
Write-Host "- Fix OpenAI prompt in Zapier to extract all required fields" -ForegroundColor White
Write-Host "- Ensure webhook body maps all fields correctly" -ForegroundColor White
Write-Host "- Test with a real email in Zapier" -ForegroundColor White