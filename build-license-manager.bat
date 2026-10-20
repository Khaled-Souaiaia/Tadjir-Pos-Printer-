@echo off
chcp 65001 > nul
title TADJIR License Manager - بناء وتجميع برنامج المطور (TADJIR-License-Manager-Setup.exe)
echo ========================================================
echo   TADJIR License Manager - Developer Edition Installer
echo   بناء وتجميع برنامج التثبيت الخاص بالمطور فقط
echo   المطور: KhaLed Souaiaia
echo ========================================================
echo.

if not exist node_modules\.bin\vite.cmd (
    echo [1/3] تثبيت حزم ومكتبات المشروع...
    call npm install
    if errorlevel 1 goto failed
)
if not exist node_modules\.bin\electron-builder.cmd (
    call npm install
    if errorlevel 1 goto failed
)

echo [2/3] بناء واجهة مدير التراخيص المستقل...
echo [3/3] بناء واختبار النسخة المحمولة والمثبتة عبر NSIS...
call npm run build:license-manager
if errorlevel 1 goto failed

echo.
echo ========================================================
if exist release\license-manager\TADJIR-Licence-Manager-Setup.exe (
    echo   [نجاح] تم إنشاء ملف تثبيت المطور بنجاح:
    echo   release\license-manager\TADJIR-Licence-Manager-Setup.exe
    echo   --^> احتفظ بهذا الملف لديك فقط ولا ترسله للزبائن إطلاقاً!
) else (
    echo   [خطأ] لم يتم العثور على ملف التثبيت المتوقع.
    goto failed
)
echo ========================================================
pause
exit /b 0

:failed
echo.
echo [خطأ] فشل بناء مدير التراخيص. راجع الخطأ أعلاه.
pause
exit /b 1
