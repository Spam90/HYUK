@echo off
cd /d "%~dp0"
npx next build > build.log 2>&1
echo BUILD DONE with exit code %ERRORLEVEL% > build_done.log

