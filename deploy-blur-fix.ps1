# Quick Deploy Script
# Run this to deploy the blur fix to production

Write-Host "🚀 Deploying Blur Fix to Production..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "src\index.css")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Verify the fix is applied
Write-Host "1️⃣ Verifying CSS fix..." -ForegroundColor Yellow
$cssCheck = Select-String -Path "src\index.css" -Pattern "body:not\(\.loading\)" -Quiet
if (!$cssCheck) {
    Write-Host "❌ Error: CSS fix not found! Please apply the fix first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ CSS fix verified" -ForegroundColor Green
Write-Host ""

# Git status
Write-Host "2️⃣ Checking git status..." -ForegroundColor Yellow
git status --short
Write-Host ""

# Confirm deployment
$confirm = Read-Host "Deploy these changes to production? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

# Add files
Write-Host "3️⃣ Adding files to git..." -ForegroundColor Yellow
git add src/index.css src/main.tsx src/App.tsx
git add BLUR_FIX_COMPLETE.md DEPLOY_BLUR_FIX.md
Write-Host "✅ Files added" -ForegroundColor Green
Write-Host ""

# Commit
Write-Host "4️⃣ Committing changes..." -ForegroundColor Yellow
git commit -m "fix: Resolve blur screen issue preventing navigation after login

- Changed CSS from body.loaded to body:not(.loading)
- Improved JavaScript timing with requestAnimationFrame
- Added safety checks in App component
- Fixes issue where screen stays blurred and blocks interaction
- Related files: index.css, main.tsx, App.tsx"
Write-Host "✅ Changes committed" -ForegroundColor Green
Write-Host ""

# Push
Write-Host "5️⃣ Pushing to repository..." -ForegroundColor Yellow
git push origin main
Write-Host "✅ Pushed to main branch" -ForegroundColor Green
Write-Host ""

# Deployment info
Write-Host "🎉 Git push complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Vercel will automatically deploy (check https://vercel.com/dashboard)"
Write-Host "2. Wait 2-3 minutes for build to complete"
Write-Host "3. Clear browser cache (Ctrl+Shift+Delete)"
Write-Host "4. Test at https://www.alaraf.online"
Write-Host ""
Write-Host "Expected result:" -ForegroundColor Yellow
Write-Host "✅ No blur blocking the screen after login"
Write-Host "✅ Can click and navigate normally"
Write-Host "✅ Console shows: [MAIN] Loading class removed, blur effects enabled"
Write-Host ""
Write-Host "If issues persist, see DEPLOY_BLUR_FIX.md for troubleshooting" -ForegroundColor Gray
