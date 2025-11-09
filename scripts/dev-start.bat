@echo off
REM Script de démarrage pour Windows (CMD)
REM Lance le backend et le frontend en parallèle

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%\..

echo 🚀 Démarrage de l'environnement de développement
echo ================================================
echo.

REM Vérifier Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python n'est pas installé ou non accessible
    exit /b 1
)
echo ✅ Python trouvé

REM Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé ou non accessible
    exit /b 1
)
echo ✅ Node.js trouvé

echo.
echo 🔄 Démarrage des services...
echo.

REM Lancer backend dans une nouvelle fenêtre
start "Backend Flask" cmd /k "cd /d %PROJECT_ROOT%\backend && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) else if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && set FLASK_DEBUG=True && python run.py"

REM Attendre un peu pour que le backend démarre
timeout /t 3 /nobreak >nul

REM Lancer frontend dans une nouvelle fenêtre
start "Frontend Vite" cmd /k "cd /d %PROJECT_ROOT%\frontend && npm run dev"

echo.
echo ✅ Services démarrés dans des fenêtres séparées
echo    Backend: http://localhost:5000
echo    Frontend: http://localhost:5173
echo.
echo Appuyez sur une touche pour fermer cette fenêtre...
pause >nul




