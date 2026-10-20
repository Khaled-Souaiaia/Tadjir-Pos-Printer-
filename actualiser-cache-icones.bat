@echo off
chcp 65001 > nul
echo ===================================================
echo   تحديث ذاكرة التخزين المؤقت لأيقونات ويندوز
echo   Refresh Windows Explorer Icon Cache
echo ===================================================
echo.
echo جاري إعادة بناء ذاكرة أيقونات نظام ويندوز لتطبيق TADJIR...
echo.

taskkill /f /im explorer.exe > nul 2>&1
timeout /t 1 /nobreak > nul

del /f /s /q /a "%localappdata%\IconCache.db" > nul 2>&1
del /f /s /q /a "%localappdata%\Microsoft\Windows\Explorer\iconcache*" > nul 2>&1
del /f /s /q /a "%localappdata%\Microsoft\Windows\Explorer\thumbcache*" > nul 2>&1

ie4uinit.exe -show > nul 2>&1

start explorer.exe

echo.
echo ✓ تم تحديث ذاكرة أيقونات ويندوز بنجاح!
echo ✓ الأيقونة الرسمية الجديدة لتطبيق TADJIR ستظهر الآن بشكل سليم.
echo.
pause
