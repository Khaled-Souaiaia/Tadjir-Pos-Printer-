import React, { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';

export const BarcodeScannerListener: React.FC = () => {
  const { scanAndAddToCart, showToast, lang } = useApp();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // أجهزة المسح ترسل الرموز بسرعة متتالية فائقة (< 80ms بين الضغطات)
      if (timeDiff > 80 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        bufferRef.current = '';

        if (barcode.length >= 3) {
          const success = scanAndAddToCart(barcode);
          if (success) {
            e.preventDefault();
            e.stopPropagation();
            // تفريغ حقل الإدخال فوراً إذا كان التركيز داخله ليكون جاهزاً للمسح التالي مباشرة
            if (isInput && target instanceof HTMLInputElement) {
              target.value = '';
              target.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } else if (!isInput) {
            showToast(
              lang === 'ar'
                ? `باركود غير مسجل: ${barcode}`
                : `Code-barres introuvable : ${barcode}`,
              'error'
            );
          }
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [scanAndAddToCart, showToast, lang]);

  return null;
};
