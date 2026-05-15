@echo off
REM PowerShell ExecutionPolicy 때문에 npm.ps1 이 막힐 때: 이 파일을 더블클릭하거나 cmd에서 실행하세요.
cd /d "%~dp0"
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [오류] npm.cmd 을(를) 찾을 수 없습니다. Node.js PATH 를 확인하세요.
  pause
  exit /b 1
)
call npm.cmd run dev:local
if errorlevel 1 pause
