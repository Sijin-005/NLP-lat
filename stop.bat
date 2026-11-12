@echo off
setlocal enabledelayedexpansion
title NLPulse - stop

REM ===================================================================
REM  Stops whatever NLPulse started.
REM
REM  Closes the two launcher windows by title, then frees ports 5173 and
REM  8000 in case a process outlived its window.
REM ===================================================================

echo.
echo   Stopping NLPulse...
echo.

REM ---------- Close the windows the launcher opened ----------
REM taskkill's exit code is not a reliable "did it match anything" signal, so
REM this just asks and reports the ports below, which we can actually verify.
echo   [..] Closing NLPulse windows
taskkill /FI "WINDOWTITLE eq NLPulse backend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq NLPulse frontend*" /T /F >nul 2>nul

REM ---------- Free the ports, in case anything is still listening ----------
REM Only LISTENING sockets are matched, so an unrelated browser connection
REM is never mistaken for a server process.
set "FREED=0"
for %%p in (5173 8000) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":%%p .*LISTENING"') do (
        taskkill /PID %%a /F >nul 2>nul
        if not errorlevel 1 (
            echo   [ok] Freed port %%p ^(pid %%a^)
            set "FREED=1"
        )
    )
)
REM FREED is assigned inside a for block, so it must be read as !FREED!.
REM %FREED% would be substituted once when the block is parsed, and would
REM therefore always read 0 even after a port was successfully freed.
if "!FREED!"=="0" echo   [ok] No leftover processes on ports 5173 or 8000

echo.
echo   Done. Run start.bat to launch again.
echo.
"%SystemRoot%\System32\timeout.exe" /t 3 /nobreak >nul 2>nul
