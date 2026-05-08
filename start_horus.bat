@echo off
cd /d "C:\Users\joaov\OneDrive\Desktop\HORUS"
if not exist logs mkdir logs

set NGROK=C:\Users\joaov\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe
set PYTHON=.venv\Scripts\python.exe
set DOMAIN=synergistic-hemathermal-myesha.ngrok-free.dev

echo %date% %time% Horus watchdog iniciado >> logs\watchdog.log

:loop
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I "python.exe" >NUL
if errorlevel 1 (
    echo %date% %time% Backend offline - reiniciando... >> logs\watchdog.log
    start "" /B %PYTHON% -m uvicorn backend.api:app --port 7291
    timeout /t 5 /nobreak >NUL
)

tasklist /FI "IMAGENAME eq ngrok.exe" 2>NUL | find /I "ngrok.exe" >NUL
if errorlevel 1 (
    echo %date% %time% Tunel offline - reiniciando ngrok... >> logs\watchdog.log
    start "" /B "%NGROK%" http 7291 --url=%DOMAIN% --log=logs\ngrok.log
    echo %date% %time% URL: https://%DOMAIN% >> logs\watchdog.log
)

timeout /t 30 /nobreak >NUL
goto loop