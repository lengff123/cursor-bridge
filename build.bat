@echo off
echo Building the project...

:: Navigate to the project directory
cd /d %~dp0

:: Run Rollup to build the project
npx rollup -c rollup.config.js

echo Build complete.
pause