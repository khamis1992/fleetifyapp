@echo off
echo ===============================================
echo   FleetifyApp - Environment Setup
echo ===============================================
echo.

REM Check if .env.local already exists
if exist .env.local (
    echo [!] File .env.local already exists!
    echo.
    choice /C YN /M "Do you want to overwrite it"
    if errorlevel 2 goto :EOF
)

echo [+] Creating .env.local file...
echo.

REM Create .env.local with template
(
echo # Supabase Configuration
echo # Generated: %date% %time%
echo.
echo # Supabase Project URL
echo VITE_SUPABASE_URL=https://qwhunliohlkkahbspfiu.supabase.co
echo.
echo # Supabase Anon/Public Key
echo # Get this from: https://supabase.com/dashboard ^> Settings ^> API
echo VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
echo.
echo # ================================================
echo # INSTRUCTIONS:
echo # ================================================
echo # 1. Go to https://supabase.com/dashboard
echo # 2. Select project: qwhunliohlkkahbspfiu
echo # 3. Navigate to Settings ^> API
echo # 4. Copy the "anon" / "public" key
echo # 5. Replace YOUR_SUPABASE_ANON_KEY_HERE above
echo # 6. Save this file
echo # 7. Restart dev server: npm run dev
echo # ================================================
) > .env.local

echo.
echo [v] File created successfully!
echo.
echo ===============================================
echo   NEXT STEPS:
echo ===============================================
echo.
echo 1. Edit .env.local and add your Supabase key
echo 2. Get the key from: https://supabase.com/dashboard
echo 3. Save the file
echo 4. Run: npm run dev
echo.
echo Opening .env.local in Notepad...
echo.

REM Open file in notepad
notepad .env.local

echo.
echo ===============================================
echo   Setup Complete!
echo ===============================================
echo.
echo After adding your key, run:
echo   npm run dev
echo.
pause

