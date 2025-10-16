@echo off
REM ================================================================
REM FLEETIFY POST-OPTIMIZATION VERIFICATION SCRIPT (Windows)
REM ================================================================
REM This script runs all verification tests in sequence
REM Run: run-verification.bat
REM ================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║     FLEETIFY POST-OPTIMIZATION VERIFICATION SUITE        ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check prerequisites
echo Checking prerequisites...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js is not installed
    echo     Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [√] Node.js installed: %NODE_VERSION%
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] npm is not installed
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [√] npm installed: %NPM_VERSION%
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [!] node_modules not found. Installing dependencies...
    call npm install
) else (
    echo [√] Dependencies installed
)

echo.

REM ================================================================
REM PART 1: Build Verification
REM ================================================================

echo ══════════════════════════════════════════════════════════
echo PART 1: BUILD VERIFICATION
echo ══════════════════════════════════════════════════════════
echo.

echo Running production build...
call npm run build

if %errorlevel% neq 0 (
    echo [X] Build failed
    pause
    exit /b 1
) else (
    echo [√] Build successful
)

echo.

REM Check bundle sizes
echo Analyzing bundle sizes...
if exist "dist\assets" (
    echo.
    echo Bundle files:
    dir /s dist\assets\*.js | find "File(s)"

    REM Check for compressed files
    if exist "dist\assets\*.gz" (
        echo [√] Gzip compression enabled
    ) else (
        echo [!] Gzip compression not found
    )

    if exist "dist\assets\*.br" (
        echo [√] Brotli compression enabled
    ) else (
        echo [!] Brotli compression not found
    )
) else (
    echo [X] dist directory not found
)

echo.

REM ================================================================
REM PART 2: Frontend Tests
REM ================================================================

echo ══════════════════════════════════════════════════════════
echo PART 2: FRONTEND VERIFICATION
echo ══════════════════════════════════════════════════════════
echo.

echo Opening frontend performance dashboard...
echo Please review: verify-frontend-performance.html in your browser
echo.

REM Open in default browser
start verify-frontend-performance.html
echo [√] Opened in default browser
echo.

pause

echo.

REM ================================================================
REM PART 3: Integration Tests
REM ================================================================

echo ══════════════════════════════════════════════════════════
echo PART 3: INTEGRATION TESTS
echo ══════════════════════════════════════════════════════════
echo.

echo Running integration tests...
echo.

node verify-integration.js

set INTEGRATION_EXIT_CODE=%errorlevel%

echo.

REM ================================================================
REM PART 4: Database Tests
REM ================================================================

echo ══════════════════════════════════════════════════════════
echo PART 4: DATABASE VERIFICATION
echo ══════════════════════════════════════════════════════════
echo.

echo [!] Manual database verification required
echo.
echo To run database tests:
echo 1. Go to your Supabase Dashboard
echo 2. Navigate to SQL Editor
echo 3. Run the script: verify-database-optimizations.sql
echo.

REM ================================================================
REM FINAL SUMMARY
REM ================================================================

echo ══════════════════════════════════════════════════════════
echo VERIFICATION SUMMARY
echo ══════════════════════════════════════════════════════════
echo.

REM Build check
if exist "dist" (
    echo [√] Build Verification: PASS
    set /a PASSED+=1
) else (
    echo [X] Build Verification: FAIL
    set /a FAILED+=1
)

REM Integration tests
if %INTEGRATION_EXIT_CODE% equ 0 (
    echo [√] Integration Tests: PASS
    set /a PASSED+=1
) else (
    echo [X] Integration Tests: FAIL
    set /a FAILED+=1
)

REM Manual reviews
echo [i] Frontend Dashboard: MANUAL REVIEW
echo [i] Database Tests: MANUAL REVIEW

echo.

REM Calculate pass rate
set /a TOTAL=PASSED+FAILED
if %TOTAL% gtr 0 (
    set /a PASS_RATE=PASSED*100/TOTAL
    echo Pass Rate: %PASS_RATE%% (%PASSED%/%TOTAL% automated tests^)
    echo.

    if %PASS_RATE% geq 90 (
        echo Grade: A+ - EXCELLENT √
        echo All optimizations working perfectly!
    ) else if %PASS_RATE% geq 70 (
        echo Grade: B - GOOD !
        echo Most optimizations working, minor issues to address
    ) else (
        echo Grade: C - NEEDS WORK X
        echo Several optimizations need attention
    )
)

echo.
echo Next Steps:
echo 1. Review POST_OPTIMIZATION_VERIFICATION_GUIDE.md for detailed results
echo 2. Check frontend dashboard for component-level metrics
echo 3. Review database verification output in Supabase SQL Editor
echo 4. Address any failed tests before production deployment
echo.

echo Generated Files:
echo   - verify-database-optimizations.sql     (Database tests)
echo   - verify-frontend-performance.html      (Frontend dashboard)
echo   - verify-integration.js                 (Integration tests)
echo   - POST_OPTIMIZATION_VERIFICATION_GUIDE.md (Complete guide)
echo.

echo Verification complete!
echo.

pause

REM Exit with appropriate code
if %FAILED% gtr 0 (
    exit /b 1
) else (
    exit /b 0
)
