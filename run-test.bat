@echo off
REM ============================================================
REM  AI DIP Studio - Chay thu (test) app o local
REM  Bam doi chuot vao file nay hoac double-click de chay.
REM ============================================================

cd /d "%~dp0"

echo.
echo ================================================
echo   AI DIP Studio - Dang khoi dong che do TEST
echo ================================================
echo.

if not exist "node_modules" (
    echo [1/2] Chua thay node_modules, dang cai dat dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo [LOI] Cai dat dependencies bi loi. Vui long kiem tra lai.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Da co node_modules, bo qua buoc cai dat.
)

echo.
echo [2/2] Dang chay Vite dev server...
echo App se tu mo tai: http://localhost:5173
echo Nhan Ctrl+C trong cua so nay de dung server.
echo.

call npm run dev

pause
