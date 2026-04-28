@echo off
echo ============================================
echo   MoneyB - First Time Setup
echo ============================================
echo.
echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed
  pause
  exit /b 1
)
echo.
echo [2/3] Setting up database...
call npx prisma db push
if errorlevel 1 (
  echo ERROR: prisma db push failed
  pause
  exit /b 1
)
echo.
echo [3/3] Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
  echo ERROR: prisma generate failed
  pause
  exit /b 1
)
echo.
echo ============================================
echo   Setup complete! Starting dev server...
echo   Open browser: http://localhost:3000
echo ============================================
echo.
call npm run dev
pause
