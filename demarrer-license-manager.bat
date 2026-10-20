@echo off
chcp 65001 > nul
title TADJIR License Manager - أدوات المطور لإصدار التراخيص
echo ========================================================
echo   TADJIR License Manager - Developer Suite (Ed25519)
echo   تطبيق المطور المستقل لتوليد وتوقيع التراخيص المشفرة
echo   تحذير أمني: خاص بالمطور فقط - لا يُسلّم للزبائن إطلاقاً
echo ========================================================
echo.

if not exist node_modules (
    echo [1/2] تثبيت الحزم والمكتبات لأول مرة...
    call npm install
)

echo [2/2] تشغيل تطبيق TADJIR License Manager...
call npx electron . --license-manager
pause
