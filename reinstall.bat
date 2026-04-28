@echo off
echo Cleaning up...
if exist package-lock.json del /f package-lock.json
if exist node_modules rmdir /s /q node_modules
echo Reinstalling (this may take 2-3 minutes)...
npm install --legacy-peer-deps
if errorlevel 1 (
  echo Install failed. Trying with --force...
  npm install --force
)
echo Done! Run: npm run dev
pause
