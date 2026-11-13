@echo off
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:5173
  python -m http.server 5173
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    start "" http://localhost:5173
    py -m http.server 5173
  ) else (
    echo Python was not found. Install Python or run: npx serve .
    pause
  )
)
