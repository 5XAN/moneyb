@echo off
echo ============================================
echo   MoneyB - Cloudflare Pages Deploy
echo ============================================
echo.
echo [1/2] Building in Docker (Linux container)...
docker run --rm ^
  -v "%CD%:/app" ^
  -w /app ^
  -e CF_PAGES=1 ^
  node:20 ^
  bash -c "npm install --legacy-peer-deps && npx @cloudflare/next-on-pages"
if errorlevel 1 (
  echo Build failed!
  pause
  exit /b 1
)
echo.
echo [2/2] Deploying to Cloudflare Pages...
npx wrangler pages deploy .vercel/output/static --project-name moneyb
echo.
echo Done! Check your Cloudflare dashboard.
pause
