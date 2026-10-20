@echo off
chcp 65001 > nul
title TADJIR - بناء وتجميع برنامج التثبيت (TADJIR-Setup.exe)
echo ========================================================
echo   TADJIR - Customer Accounting & POS Installer Builder
echo   بناء وتجميع برنامج التثبيت للعملاء (TADJIR-Setup.exe)
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

echo [2/3] بناء وتدقيق حزمة العميل (فحص الأمان واستبعاد المفاتيح الخاصة)...
echo [3/3] بناء واختبار النسخة المحمولة والمثبتة عبر NSIS...
call npm run build:tadjir
if errorlevel 1 goto failed

echo.
echo ========================================================
if exist release\tadjir\TADJIR-Setup.exe (
    echo   [نجاح] تم إنشاء ملف التثبيت بنجاح:
    echo   release\tadjir\TADJIR-Setup.exe
    echo   --^> قم بإرسال هذا الملف حصرياً للعملاء.
) else (
    echo   [خطأ] لم يتم العثور على ملف التثبيت المتوقع.
    goto failed
)
echo ========================================================
pause
exit /b 0

:failed
echo.
echo [خطأ] فشل بناء TADJIR. راجع الخطأ أعلاه.
pause
exit /b 1
