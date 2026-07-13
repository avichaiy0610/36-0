@echo off
rem ── 36-0: run the site locally ─────────────────────────────────────────────
rem Double-click this file, then open:  http://localhost:8371
rem Admin panel:                        http://localhost:8371/admin.html
rem Keep this window open while playing. Close it to stop the server.
cd /d "%~dp0"
echo.
echo   36-0 local server running!
echo.
echo   Game:   http://localhost:8371
echo   Admin:  http://localhost:8371/admin.html
echo.
start "" http://localhost:8371
python -m http.server 8371
