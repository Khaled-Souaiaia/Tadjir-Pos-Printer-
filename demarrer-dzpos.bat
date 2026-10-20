@echo off
chcp 65001 > nul
title DzPOS Pro - تشغيل نظام المحلات ونقاط البيع الجزائر
echo ========================================================
echo   DzPOS Pro - Logiciel de Gestion Commerciale et Caisse
echo   جاري تشغيل البرنامج...
echo ========================================================
echo.

if not exist node_modules (
    echo [1/2] تثبيت الحزم والمكتبات لأول مرة...
    call npm install
)

echo [2/2] تشغيل الواجهة المكتبية...
call npm run dev
pause
