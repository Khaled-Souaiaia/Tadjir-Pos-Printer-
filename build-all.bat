@echo off
chcp 65001 > nul
title TADJIR Suite - بناء وتجميع ملفي التثبيت لكلا البرنامجين
echo ========================================================
echo   TADJIR Suite - Master Installers Build
echo   بناء وتجميع البرنامجين في مجلد release/
echo   1. TADJIR-Setup.exe (للعملاء)
echo   2. TADJIR-Licence-Manager-Setup.exe (للمطور فقط)
echo ========================================================
echo.

if not exist node_modules\.bin\vite.cmd (
    echo [1/4] تثبيت حزم ومكتبات المشروع...
    call npm install
    if errorlevel 1 goto failed
)
if not exist node_modules\.bin\electron-builder.cmd (
    call npm install
    if errorlevel 1 goto failed
)

echo [2/4] بناء واختبار البرنامجين المستقلين...
call npm run build:all
if errorlevel 1 goto failed

echo.
echo ========================================================
echo   النتائج متوفرة داخل مجلد: release/
echo ========================================================
if exist release\tadjir\TADJIR-Setup.exe (
    echo   [1] release\tadjir\TADJIR-Setup.exe (نسخة العملاء)
) else (
    echo   [خطأ] تعذر العثور على مثبت TADJIR.
    goto failed
)
if exist release\license-manager\TADJIR-Licence-Manager-Setup.exe (
    echo   [2] release\license-manager\TADJIR-Licence-Manager-Setup.exe (نسخة المطور)
) else (
    echo   [خطأ] تعذر العثور على مثبت مدير التراخيص.
    goto failed
)
echo ========================================================
pause
exit /b 0

:failed
echo.
echo [خطأ] فشل بناء أحد التطبيقين. راجع الخطأ أعلاه.
pause
exit /b 1
