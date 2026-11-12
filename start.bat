@echo off
setlocal enabledelayedexpansion
title NLPulse - launcher

REM ===================================================================
REM  NLPulse launcher
REM
REM  Starts the FastAPI measurement backend and the Vite frontend, each
REM  in its own window, then opens a browser.
REM
REM  First run also installs dependencies. After that it takes seconds.
REM
REM  The seminar does NOT depend on the backend: if Python is missing or
REM  the backend fails, the frontend still starts and everything except
REM  Real Test mode works exactly as normal.
REM ===================================================================

cd /d "%~dp0"

echo.
echo   NLPulse - Inside AI Response Time
echo   =================================
echo.

REM ---------- Node check ----------
where node >nul 2>nul
if errorlevel 1 (
    echo   [X] Node.js was not found on PATH.
    echo       Install Node 18 or newer from https://nodejs.org and run this again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo   [ok] Node %%v

REM ---------- Frontend dependencies ----------
if not exist "frontend\node_modules" (
    echo   [..] Installing frontend dependencies. First run only, please wait.
    pushd frontend
    call npm install
    if errorlevel 1 (
        echo   [X] npm install failed. Check the output above.
        popd
        pause
        exit /b 1
    )
    popd
    echo   [ok] Frontend dependencies installed
) else (
    echo   [ok] Frontend dependencies present
)

REM ---------- Python / backend (optional) ----------
set "BACKEND_READY=0"
set "PY_CMD="

where py >nul 2>nul
if not errorlevel 1 set "PY_CMD=py -3"
if "!PY_CMD!"=="" (
    where python >nul 2>nul
    if not errorlevel 1 set "PY_CMD=python"
)

if "!PY_CMD!"=="" (
    echo   [!] Python was not found. Real Test mode will be unavailable.
    echo       Everything else - simulation, Seminar Mode, charts - works fine.
) else (
    if not exist "backend\.venv\Scripts\python.exe" (
        echo   [..] Creating the backend virtual environment. First run only.
        pushd backend
        !PY_CMD! -m venv .venv
        if errorlevel 1 (
            echo   [!] Could not create the virtual environment. Skipping the backend.
            popd
            goto :after_backend
        )
        echo   [..] Installing backend dependencies.
        .venv\Scripts\python.exe -m pip install --upgrade pip --quiet
        .venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
        if errorlevel 1 (
            echo   [!] Backend dependencies failed to install. Skipping the backend.
            popd
            goto :after_backend
        )
        popd
    )
    set "BACKEND_READY=1"
    echo   [ok] Backend environment ready
)

:after_backend

REM ---------- Launch ----------
echo.
if "!BACKEND_READY!"=="1" (
    echo   [..] Starting backend on http://127.0.0.1:8000
    start "NLPulse backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000"
)

echo   [..] Starting frontend on http://localhost:5173
start "NLPulse frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM Give Vite a moment to bind the port before the browser asks for it.
"%SystemRoot%\System32\timeout.exe" /t 5 /nobreak >nul 2>nul
start "" http://localhost:5173

echo.
echo   NLPulse is starting.
echo.
echo     Frontend   http://localhost:5173
if "!BACKEND_READY!"=="1" echo     Backend    http://127.0.0.1:8000/api/health
echo.
echo   Two new windows have opened. Closing them stops the servers,
echo   or run stop.bat.
echo.
echo   Seminar tips:
echo     - Press G for Seminar Mode, then Space to advance.
echo     - Press F for fullscreen, P to pause, R to reset.
echo.
pause
