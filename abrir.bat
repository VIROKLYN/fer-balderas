@echo off
cd /d "%~dp0"
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:4173"
py -m http.server 4173
if errorlevel 1 python -m http.server 4173
